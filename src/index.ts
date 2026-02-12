import * as THREE from "three"
import { Vector2 } from "three"

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'

import RenderPixelatedPass from "./RenderPixelatedPass"
import PixelatePass from "./PixelatePass"

let camera: THREE.OrthographicCamera, scene: THREE.Scene, renderer: THREE.WebGLRenderer, composer: EffectComposer
let controls: OrbitControls
let clouds: THREE.Mesh[] = []

init()
animate()

function init() {

    let screenResolution = new Vector2(window.innerWidth, window.innerHeight)
    let renderResolution = screenResolution.clone().divideScalar(6)
    renderResolution.x |= 0
    renderResolution.y |= 0
    let aspectRatio = screenResolution.x / screenResolution.y

    // --- カメラ（正射影・アイソメトリック風） ---
    camera = new THREE.OrthographicCamera(-aspectRatio * 2, aspectRatio * 2, 2, -2, 0.1, 100)
    camera.position.set(8, 8, 8)
    camera.lookAt(0, 0, 0)

    scene = new THREE.Scene()

    // --- 昼空の背景色 ---
    scene.background = new THREE.Color(0x87CEEB) // スカイブルー

    // --- レンダラー ---
    renderer = new THREE.WebGLRenderer({ antialias: false })
    renderer.shadowMap.enabled = true
    renderer.setSize(screenResolution.x, screenResolution.y)
    document.body.appendChild(renderer.domElement)

    // --- ポストプロセス（既存のピクセルシェーダーをそのまま活用） ---
    composer = new EffectComposer(renderer)
    composer.addPass(new RenderPixelatedPass(renderResolution, scene, camera))
    let bloomPass = new UnrealBloomPass(screenResolution, .15, .1, .9)
    composer.addPass(bloomPass)
    composer.addPass(new PixelatePass(renderResolution))

    // --- カメラ操作 ---
    controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 0, 0)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.update()

    // =========================================
    //  Step 1: 地面 + 雲
    // =========================================

    createGround()
    createClouds()

    // =========================================
    //  Step 2: 木 + 草
    // =========================================

    createTrees()
    createGroundGrass()

    // --- ライティング（昼間の太陽光） ---
    // 環境光: やや暖色の柔らかい光
    scene.add(new THREE.AmbientLight(0xfff5e6, 0.8))

    // 太陽光: 右上手前から照射、影あり
    {
        let sunLight = new THREE.DirectionalLight(0xfffde0, 1.0)
        sunLight.position.set(5, 10, 5)
        sunLight.castShadow = true
        sunLight.shadow.mapSize.set(2048, 2048)
        sunLight.shadow.camera.near = 0.1
        sunLight.shadow.camera.far = 50
        sunLight.shadow.camera.left = -10
        sunLight.shadow.camera.right = 10
        sunLight.shadow.camera.top = 10
        sunLight.shadow.camera.bottom = -10
        scene.add(sunLight)
    }

    // --- ウィンドウリサイズ対応 ---
    window.addEventListener('resize', () => {
        screenResolution = new Vector2(window.innerWidth, window.innerHeight)
        aspectRatio = screenResolution.x / screenResolution.y
        camera.left = -aspectRatio * 2
        camera.right = aspectRatio * 2
        camera.top = 2
        camera.bottom = -2
        camera.updateProjectionMatrix()
        renderer.setSize(screenResolution.x, screenResolution.y)
    })
}

// =========================================
//  地面
// =========================================
function createGround() {

    const groundSize = 8
    const groundHeight = 0.4

    // 6面それぞれに異なるマテリアルを適用
    // BoxGeometry の面順序: +X, -X, +Y(上面), -Y(底面), +Z, -Z
    const grassMat = new THREE.MeshPhongMaterial({
        color: 0x5a9a3c, // 上面: 草の緑（落ち着いた自然な緑）
        flatShading: true
    })
    const dirtMat = new THREE.MeshPhongMaterial({
        color: 0x8B6914, // 側面・底面: 土色
        flatShading: true
    })

    const groundMaterials = [
        dirtMat, // +X 側面
        dirtMat, // -X 側面
        grassMat, // +Y 上面（芝生！）
        dirtMat, // -Y 底面
        dirtMat, // +Z 側面
        dirtMat  // -Z 側面
    ]

    const groundGeo = new THREE.BoxGeometry(groundSize, groundHeight, groundSize)
    const ground = new THREE.Mesh(groundGeo, groundMaterials)
    ground.position.y = -groundHeight / 2 // 上面がちょうど y=0 になるように
    ground.receiveShadow = true
    ground.castShadow = false
    scene.add(ground)

    // --- 小道（家への道） ---
    // BoxGeometry を使って地面より少し上に浮かせる（Z-fighting回避）
    const pathWidth = 1.2
    const pathLength = 4.0
    const pathHeight = 0.04
    const pathGeo = new THREE.BoxGeometry(pathWidth, pathHeight, pathLength)
    const pathMat = new THREE.MeshPhongMaterial({
        color: 0xc4b28f, // 砂利道の色
        flatShading: true
    })
    const path = new THREE.Mesh(pathGeo, pathMat)
    path.position.set(0, pathHeight / 2, 0.5)
    path.receiveShadow = true
    scene.add(path)
}

// =========================================
//  木（Step 2）
// =========================================
function createTrees() {

    // 幹のマテリアル
    const trunkMat = new THREE.MeshPhongMaterial({
        color: 0x6b4226, // 木の幹の茶色
        flatShading: true
    })

    // 葉のマテリアル（複数色でバリエーション）
    const leafColors = [0x3d8c2f, 0x4a9e38, 0x2d7a22, 0x52a840]
    const leafMats = leafColors.map(c =>
        new THREE.MeshPhongMaterial({ color: c, flatShading: true })
    )

    // 木を1本作る関数
    function makeTree(x: number, z: number, size: 'small' | 'medium' | 'large') {
        const treeGroup = new THREE.Group()

        // サイズ別パラメータ
        const params = {
            small: { trunkH: 0.3, trunkR: 0.04, leafR: 0.2, leafY: 0.4 },
            medium: { trunkH: 0.5, trunkR: 0.06, leafR: 0.35, leafY: 0.6 },
            large: { trunkH: 0.7, trunkR: 0.08, leafR: 0.45, leafY: 0.85 }
        }
        const p = params[size]

        // 幹（円柱）
        const trunkGeo = new THREE.CylinderGeometry(p.trunkR, p.trunkR * 1.3, p.trunkH, 6)
        const trunk = new THREE.Mesh(trunkGeo, trunkMat)
        trunk.position.y = p.trunkH / 2
        trunk.castShadow = true
        trunk.receiveShadow = true
        treeGroup.add(trunk)

        // 葉（丸い塊）- メインの葉
        const leafMat = leafMats[Math.floor(Math.random() * leafMats.length)]
        const leafGeo = new THREE.IcosahedronGeometry(p.leafR, 0)
        const leaf = new THREE.Mesh(leafGeo, leafMat)
        leaf.position.y = p.leafY
        leaf.rotation.y = Math.random() * Math.PI
        leaf.castShadow = true
        leaf.receiveShadow = true
        treeGroup.add(leaf)

        // 葉のサブパーツ（少し小さい球をずらして追加、もこもこ感）
        if (size !== 'small') {
            const subLeafCount = size === 'large' ? 3 : 2
            for (let i = 0; i < subLeafCount; i++) {
                const subR = p.leafR * (0.5 + Math.random() * 0.3)
                const subGeo = new THREE.IcosahedronGeometry(subR, 0)
                const subLeafMat = leafMats[Math.floor(Math.random() * leafMats.length)]
                const subLeaf = new THREE.Mesh(subGeo, subLeafMat)
                const angle = (i / subLeafCount) * Math.PI * 2 + Math.random() * 0.5
                subLeaf.position.set(
                    Math.cos(angle) * p.leafR * 0.5,
                    p.leafY - 0.05 + Math.random() * 0.1,
                    Math.sin(angle) * p.leafR * 0.5
                )
                subLeaf.castShadow = true
                treeGroup.add(subLeaf)
            }
        }

        treeGroup.position.set(x, 0, z)
        scene.add(treeGroup)
        return treeGroup
    }

    // --- 木の配置 ---

    // 大きな木（奥の方に数本）
    makeTree(-2.5, -2.5, 'large')
    makeTree(2.8, -2.0, 'large')
    makeTree(-1.5, -3.0, 'large')

    // 中くらいの木
    makeTree(2.0, 2.0, 'medium')
    makeTree(-2.8, 1.5, 'medium')
    makeTree(1.5, -3.2, 'medium')
    makeTree(-3.0, -0.5, 'medium')

    // 小さな木（手前やアクセント）
    makeTree(3.2, -0.5, 'small')
    makeTree(-1.8, 2.5, 'small')
    makeTree(0.8, -2.8, 'small')
    makeTree(3.0, 2.8, 'small')
}

// =========================================
//  地面の低い草（Step 2）
// =========================================
function createGroundGrass() {

    // 低い草のマテリアル
    const grassDark = new THREE.MeshPhongMaterial({
        color: 0x4a8c30,
        flatShading: true
    })
    const grassLight = new THREE.MeshPhongMaterial({
        color: 0x6db84a,
        flatShading: true
    })

    // 小さな草の束を散らばせる
    for (let i = 0; i < 35; i++) {
        const grassGroup = new THREE.Group()
        const bladeCount = 2 + Math.floor(Math.random() * 3)

        for (let j = 0; j < bladeCount; j++) {
            const bladeH = 0.06 + Math.random() * 0.08
            const bladeW = 0.03
            const bladeGeo = new THREE.BoxGeometry(bladeW, bladeH, bladeW)
            const blade = new THREE.Mesh(
                bladeGeo,
                Math.random() > 0.5 ? grassDark : grassLight
            )
            blade.position.set(
                (Math.random() - 0.5) * 0.08,
                bladeH / 2,
                (Math.random() - 0.5) * 0.08
            )
            blade.castShadow = true
            grassGroup.add(blade)
        }

        // 小道と木の位置を避けてランダム配置
        let gx, gz
        do {
            gx = (Math.random() - 0.5) * 7
            gz = (Math.random() - 0.5) * 7
        } while (Math.abs(gx) < 0.9 && gz > -1.0 && gz < 3.0)

        grassGroup.position.set(gx, 0, gz)
        scene.add(grassGroup)
    }
}

// =========================================
//  雲
// =========================================
function createClouds() {

    const cloudMat = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        flatShading: true,
        transparent: true,
        opacity: 0.85
    })

    // 雲を一つ作る関数（複数のSphereの塊）
    function makeCloud(x: number, y: number, z: number, scale: number) {
        const cloudGroup = new THREE.Group()

        // 中央の大きな玉
        const center = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 6, 4),
            cloudMat
        )
        cloudGroup.add(center)

        // 左側
        const left = new THREE.Mesh(
            new THREE.SphereGeometry(0.35, 5, 4),
            cloudMat
        )
        left.position.set(-0.4, -0.05, 0)
        cloudGroup.add(left)

        // 右側
        const right = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 5, 4),
            cloudMat
        )
        right.position.set(0.45, -0.05, 0.1)
        cloudGroup.add(right)

        // 奥側
        const back = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 5, 4),
            cloudMat
        )
        back.position.set(0.1, 0.05, -0.3)
        cloudGroup.add(back)

        cloudGroup.position.set(x, y, z)
        cloudGroup.scale.set(scale, scale * 0.5, scale)
        scene.add(cloudGroup)

        // アニメーション用に返す
        return cloudGroup as unknown as THREE.Mesh
    }

    // 複数の雲を配置
    clouds.push(makeCloud(-2, 5, -3, 1.2))
    clouds.push(makeCloud(3, 5.5, -4, 0.9))
    clouds.push(makeCloud(0, 6, -5, 1.5))
    clouds.push(makeCloud(-4, 5.2, -2, 0.7))
    clouds.push(makeCloud(5, 5.8, -3.5, 1.0))
}

// =========================================
//  アニメーションループ
// =========================================
function animate() {
    requestAnimationFrame(animate)

    let t = performance.now() / 1000

    // 雲のゆっくりした移動
    clouds.forEach((cloud, i) => {
        cloud.position.x += 0.002 * (i % 2 === 0 ? 1 : 0.7)
        // 画面外に出たら反対側に戻す
        if (cloud.position.x > 10) {
            cloud.position.x = -10
        }
    })

    controls.update()
    composer.render()
}
