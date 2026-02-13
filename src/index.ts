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

    // =========================================
    //  Step 3: 家
    // =========================================

    createHouse()

    // =========================================
    //  Step 5: 花壇
    // =========================================

    createFlowerbeds()

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
}

// =========================================
//  家（Step 3）— ハーフティンバー風
// =========================================
function createHouse() {

    const houseX = 0
    const houseZ = -0.5

    const houseGroup = new THREE.Group()

    // --- マテリアル定義 ---
    const wallMat = new THREE.MeshPhongMaterial({
        color: 0xf0e0c8, flatShading: true // クリーム色の漆喰壁
    })
    const woodMat = new THREE.MeshPhongMaterial({
        color: 0x5c3a1e, flatShading: true // 濃茶: 木の梁・柱
    })
    const roofMat = new THREE.MeshPhongMaterial({
        color: 0xb54a3a, flatShading: true // 赤茶色の屋根
    })
    const roofDarkMat = new THREE.MeshPhongMaterial({
        color: 0x8c3528, flatShading: true // 屋根の暗い部分
    })
    const doorMat = new THREE.MeshPhongMaterial({
        color: 0x7a4a2a, flatShading: true // ドア
    })
    const windowMat = new THREE.MeshPhongMaterial({
        color: 0xaad4ee, emissive: 0x2a5a7a, emissiveIntensity: 0.15, flatShading: true
    })
    const stoneMat = new THREE.MeshPhongMaterial({
        color: 0x9a9080, flatShading: true // 基礎の石色
    })
    const chimneyMat = new THREE.MeshPhongMaterial({
        color: 0x7a6a5a, flatShading: true
    })
    const pathMat = new THREE.MeshPhongMaterial({
        color: 0xc4b28f, flatShading: true
    })

    // ========== 寸法定義 ==========
    const wallW = 1.8
    const wallH = 0.9
    const wallD = 1.3
    const foundH = 0.12
    const roofH = 0.8
    const roofOverhang = 0.2
    const bt = 0.06 // beam thickness

    // ========== 基礎（石垣） ==========
    const foundGeo = new THREE.BoxGeometry(wallW + 0.1, foundH, wallD + 0.1)
    const foundation = new THREE.Mesh(foundGeo, stoneMat)
    foundation.position.y = foundH / 2
    foundation.castShadow = true
    foundation.receiveShadow = true
    houseGroup.add(foundation)

    // ========== 1階 壁 ==========
    const wallGeo = new THREE.BoxGeometry(wallW, wallH, wallD)
    const mainWall = new THREE.Mesh(wallGeo, wallMat)
    mainWall.position.y = foundH + wallH / 2
    mainWall.castShadow = true
    mainWall.receiveShadow = true
    houseGroup.add(mainWall)

    // ========== 切妻屋根（ExtrudeGeometry） ==========
    const roofShape = new THREE.Shape()
    const halfW = wallW / 2 + roofOverhang
    roofShape.moveTo(-halfW, 0)
    roofShape.lineTo(0, roofH)
    roofShape.lineTo(halfW, 0)
    roofShape.lineTo(-halfW, 0)

    const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
        depth: wallD + roofOverhang * 2,
        bevelEnabled: false
    })
    const roof = new THREE.Mesh(roofGeo, roofMat)
    roof.position.set(0, foundH + wallH, -wallD / 2 - roofOverhang)
    roof.castShadow = true
    roof.receiveShadow = true
    houseGroup.add(roof)

    // 棟木（てっぺんの横木）
    const ridgeGeo = new THREE.BoxGeometry(bt * 1.5, bt, wallD + roofOverhang * 2 + 0.05)
    const ridge = new THREE.Mesh(ridgeGeo, woodMat)
    ridge.position.set(0, foundH + wallH + roofH, 0)
    ridge.castShadow = true
    houseGroup.add(ridge)

    // ========== ハーフティンバー（木の梁） ==========
    function addBeam(w: number, h: number, d: number, x: number, y: number, z: number) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), woodMat)
        beam.position.set(x, y, z)
        beam.castShadow = true
        houseGroup.add(beam)
    }

    const bY = foundH

    // 正面 (Z+)
    const fZ = wallD / 2 + 0.03
    addBeam(wallW + 0.04, bt, bt, 0, bY + bt / 2, fZ)                // 下横梁
    addBeam(wallW + 0.04, bt, bt, 0, bY + wallH - bt / 2, fZ)        // 上横梁
    addBeam(wallW + 0.04, bt, bt, 0, bY + wallH * 0.5, fZ)           // 中段横梁
    addBeam(bt, wallH, bt, -wallW / 2, bY + wallH / 2, fZ)           // 左柱
    addBeam(bt, wallH, bt, wallW / 2, bY + wallH / 2, fZ)            // 右柱
    addBeam(bt, wallH * 0.5, bt, -0.22, bY + wallH * 0.25, fZ)       // ドア左柱
    addBeam(bt, wallH * 0.5, bt, 0.22, bY + wallH * 0.25, fZ)        // ドア右柱

    // 背面 (Z-)
    const bZ = -wallD / 2 - 0.03
    addBeam(wallW + 0.04, bt, bt, 0, bY + bt / 2, bZ)
    addBeam(wallW + 0.04, bt, bt, 0, bY + wallH - bt / 2, bZ)
    addBeam(bt, wallH, bt, -wallW / 2, bY + wallH / 2, bZ)
    addBeam(bt, wallH, bt, wallW / 2, bY + wallH / 2, bZ)
    addBeam(bt, wallH, bt, 0, bY + wallH / 2, bZ)                    // 中央柱

    // 側面 (X+, X-)
    for (const side of [-1, 1]) {
        const sX = side * (wallW / 2 + 0.03)
        addBeam(bt, wallH, bt, sX, bY + wallH / 2, -wallD / 4)
        addBeam(bt, wallH, bt, sX, bY + wallH / 2, wallD / 4)
        addBeam(bt, bt, wallD + 0.04, sX, bY + bt / 2, 0)
        addBeam(bt, bt, wallD + 0.04, sX, bY + wallH - bt / 2, 0)
        addBeam(bt, bt, wallD + 0.04, sX, bY + wallH * 0.5, 0)       // 中段横梁
    }

    // ========== ドア ==========
    const doorW = 0.3
    const doorH = 0.42
    const door = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.06), doorMat)
    door.position.set(0, foundH + doorH / 2, wallD / 2 + 0.04)
    door.castShadow = true
    houseGroup.add(door)

    // ドアノブ
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 4), stoneMat)
    knob.position.set(0.08, foundH + doorH * 0.45, wallD / 2 + 0.08)
    houseGroup.add(knob)

    // ========== 窓 ==========
    function addWindow(wx: number, wy: number, wz: number, faceAxis: 'z' | 'x') {
        const wS = 0.2
        const wD = 0.06
        const ft = 0.025 // frame thickness

        // ガラス
        const glassGeo = faceAxis === 'z'
            ? new THREE.BoxGeometry(wS, wS, wD)
            : new THREE.BoxGeometry(wD, wS, wS)
        const glass = new THREE.Mesh(glassGeo, windowMat)
        glass.position.set(wx, wy, wz)
        houseGroup.add(glass)

        // 窓枠（十字に木を入れる）
        const outward = faceAxis === 'z' ? (wz > 0 ? 0.015 : -0.015) : (wx > 0 ? 0.015 : -0.015)
        if (faceAxis === 'z') {
            addBeam(ft, wS + ft * 2, ft, wx, wy, wz + outward)       // 縦
            addBeam(wS + ft * 2, ft, ft, wx, wy, wz + outward)       // 横
        } else {
            addBeam(ft, wS + ft * 2, ft, wx + outward, wy, wz)
            addBeam(ft, ft, wS + ft * 2, wx + outward, wy, wz)
        }
    }

    const winY = foundH + wallH * 0.6
    // 正面（ドアの左右）
    addWindow(-0.55, winY, wallD / 2 + 0.04, 'z')
    addWindow(0.55, winY, wallD / 2 + 0.04, 'z')
    // 側面
    addWindow(-wallW / 2 - 0.04, winY, 0, 'x')
    addWindow(wallW / 2 + 0.04, winY, 0, 'x')
    // 背面
    addWindow(-0.35, winY, -wallD / 2 - 0.04, 'z')
    addWindow(0.35, winY, -wallD / 2 - 0.04, 'z')

    // ========== ポーチ（玄関の庇） ==========
    const porchW = 0.7
    const porchD = 0.35

    // 庇の屋根
    const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(porchW, 0.04, porchD), roofDarkMat)
    porchRoof.position.set(0, foundH + doorH + 0.08, wallD / 2 + porchD / 2)
    porchRoof.castShadow = true
    houseGroup.add(porchRoof)

    // 庇を支える柱
    const pillarGeo = new THREE.BoxGeometry(0.05, doorH + 0.08, 0.05)
    for (const px of [-porchW / 2 + 0.03, porchW / 2 - 0.03]) {
        const pillar = new THREE.Mesh(pillarGeo, woodMat)
        pillar.position.set(px, foundH + (doorH + 0.08) / 2, wallD / 2 + porchD - 0.03)
        pillar.castShadow = true
        houseGroup.add(pillar)
    }

    // ポーチの床
    const porchFloor = new THREE.Mesh(new THREE.BoxGeometry(porchW, 0.04, porchD), stoneMat)
    porchFloor.position.set(0, foundH / 2, wallD / 2 + porchD / 2)
    porchFloor.receiveShadow = true
    houseGroup.add(porchFloor)

    // ========== 煙突 ==========
    const chW = 0.18
    const chH = 0.55
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(chW, chH, chW), chimneyMat)
    chimney.position.set(wallW * 0.28, foundH + wallH + roofH * 0.55, -wallD * 0.2)
    chimney.castShadow = true
    houseGroup.add(chimney)

    // 煙突キャップ
    const chimneyTop = new THREE.Mesh(new THREE.BoxGeometry(chW + 0.06, 0.04, chW + 0.06), chimneyMat)
    chimneyTop.position.set(wallW * 0.28, foundH + wallH + roofH * 0.55 + chH / 2 + 0.02, -wallD * 0.2)
    houseGroup.add(chimneyTop)

    // ========== 家全体を配置 ==========
    houseGroup.position.set(houseX, 0, houseZ)
    scene.add(houseGroup)

    // ========== 小道（玄関からの道） ==========
    const pathWidth = 0.7
    const pathLength = 2.5
    const pathHeight = 0.03
    const pathGeo = new THREE.BoxGeometry(pathWidth, pathHeight, pathLength)
    const path = new THREE.Mesh(pathGeo, pathMat)
    path.position.set(houseX, pathHeight / 2, houseZ + wallD / 2 + porchD + pathLength / 2 + 0.05)
    path.receiveShadow = true
    scene.add(path)
}

// =========================================
//  花壇（Step 5）
// =========================================
function createFlowerbeds() {

    // --- マテリアル ---
    const soilMat = new THREE.MeshPhongMaterial({
        color: 0x6b4423, flatShading: true // 茶色の土
    })
    const soilEdgeMat = new THREE.MeshPhongMaterial({
        color: 0x8B6914, flatShading: true // 花壇の縁（木色）
    })

    // 花の色バリエーション
    const flowerColors = [
        0xff6b8a, // ピンク
        0xffd93d, // 黄色
        0xff8c42, // オレンジ
        0xc084fc, // 紫
        0xf87171, // 赤
        0xffffff, // 白
    ]
    const flowerMats = flowerColors.map(c =>
        new THREE.MeshPhongMaterial({ color: c, flatShading: true })
    )
    const stemMat = new THREE.MeshPhongMaterial({
        color: 0x3d7a28, flatShading: true // 茎の緑
    })
    const leafMat = new THREE.MeshPhongMaterial({
        color: 0x4a9030, flatShading: true // 葉っぱの緑
    })

    // --- 花壇を1つ作る関数 ---
    function makeFlowerbed(
        x: number, z: number,
        bedW: number, bedD: number,
        flowerCount: number,
        rotY: number = 0
    ) {
        const bedGroup = new THREE.Group()

        // 土のベッド
        const bedH = 0.06
        const bed = new THREE.Mesh(
            new THREE.BoxGeometry(bedW, bedH, bedD),
            soilMat
        )
        bed.position.y = bedH / 2
        bed.receiveShadow = true
        bedGroup.add(bed)

        // 花壇の縁（木枠）
        const edgeT = 0.04
        const edgeH = bedH + 0.02
        // 前後
        for (const dz of [-bedD / 2, bedD / 2]) {
            const edge = new THREE.Mesh(
                new THREE.BoxGeometry(bedW + edgeT * 2, edgeH, edgeT),
                soilEdgeMat
            )
            edge.position.set(0, edgeH / 2, dz)
            edge.castShadow = true
            bedGroup.add(edge)
        }
        // 左右
        for (const dx of [-bedW / 2, bedW / 2]) {
            const edge = new THREE.Mesh(
                new THREE.BoxGeometry(edgeT, edgeH, bedD),
                soilEdgeMat
            )
            edge.position.set(dx, edgeH / 2, 0)
            edge.castShadow = true
            bedGroup.add(edge)
        }

        // 花を植える
        for (let i = 0; i < flowerCount; i++) {
            const fx = (Math.random() - 0.5) * (bedW - 0.1)
            const fz = (Math.random() - 0.5) * (bedD - 0.1)

            // 茎
            const stemH = 0.08 + Math.random() * 0.1
            const stem = new THREE.Mesh(
                new THREE.BoxGeometry(0.02, stemH, 0.02),
                stemMat
            )
            stem.position.set(fx, bedH + stemH / 2, fz)
            stem.castShadow = true
            bedGroup.add(stem)

            // 花（球or多面体）
            const mat = flowerMats[Math.floor(Math.random() * flowerMats.length)]
            const flowerSize = 0.04 + Math.random() * 0.03
            const flowerGeo = Math.random() > 0.5
                ? new THREE.SphereGeometry(flowerSize, 5, 4)
                : new THREE.IcosahedronGeometry(flowerSize, 0)
            const flower = new THREE.Mesh(flowerGeo, mat)
            flower.position.set(fx, bedH + stemH + flowerSize * 0.5, fz)
            flower.rotation.set(
                Math.random() * 0.3,
                Math.random() * Math.PI,
                Math.random() * 0.3
            )
            flower.castShadow = true
            bedGroup.add(flower)

            // 葉っぱ（たまに追加）
            if (Math.random() > 0.4) {
                const leafGeo = new THREE.BoxGeometry(0.06, 0.015, 0.025)
                const leaf = new THREE.Mesh(leafGeo, leafMat)
                leaf.position.set(fx + 0.03, bedH + stemH * 0.4, fz)
                leaf.rotation.z = -0.4
                bedGroup.add(leaf)
            }
        }

        bedGroup.position.set(x, 0, z)
        bedGroup.rotation.y = rotY
        scene.add(bedGroup)
    }

    // --- 花壇の配置 ---

    // 家の左側（長い花壇）
    makeFlowerbed(-1.4, -0.5, 0.5, 1.2, 8)

    // 家の右側（長い花壇）
    makeFlowerbed(1.4, -0.5, 0.5, 1.2, 8)

    // 小道の左側（小さな花壇）
    makeFlowerbed(-0.8, 1.2, 0.6, 0.5, 5)

    // 小道の右側（小さな花壇）
    makeFlowerbed(0.8, 1.2, 0.6, 0.5, 5)

    // 家の裏（奥側）
    makeFlowerbed(0, -1.8, 1.4, 0.4, 10)
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
