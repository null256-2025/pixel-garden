import * as THREE from "three"

// --- 木を1本作る関数 ---
export function makeTree(scene: THREE.Scene, x: number, z: number, size: 'small' | 'medium' | 'large') {
    const treeGroup = new THREE.Group()

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

    treeGroup.userData.type = 'tree'
    treeGroup.position.set(x, 0, z)
    treeGroup.rotation.y = Math.random() * Math.PI * 2
    const scale = 0.8 + Math.random() * 0.4
    treeGroup.scale.setScalar(scale)

    scene.add(treeGroup)
    return treeGroup
}

/**
 * 初期シーン用に木を複数本作成してシーンに追加する
 */
export function createTrees(scene: THREE.Scene): THREE.Group[] {
    const trees: THREE.Group[] = []

    // 大きな木（奥の方に数本）
    trees.push(makeTree(scene, -2.5, -2.5, 'large'))
    trees.push(makeTree(scene, 2.8, -2.0, 'large'))
    trees.push(makeTree(scene, -1.5, -3.0, 'large'))

    // 中くらいの木
    trees.push(makeTree(scene, 2.0, 2.0, 'medium'))
    trees.push(makeTree(scene, -2.8, 1.5, 'medium'))
    trees.push(makeTree(scene, 1.5, -3.2, 'medium'))
    trees.push(makeTree(scene, -3.0, -0.5, 'medium'))

    // 小さな木（手前やアクセント）
    trees.push(makeTree(scene, 3.2, -0.5, 'small'))
    trees.push(makeTree(scene, -1.8, 2.5, 'small'))
    trees.push(makeTree(scene, 0.8, -2.8, 'small'))
    trees.push(makeTree(scene, 3.0, 2.8, 'small'))

    return trees
}



export function makeGrassPatch(scene: THREE.Scene, x: number, z: number) {
    // 低い草のマテリアル
    const grassDark = new THREE.MeshPhongMaterial({
        color: 0x4a8c30,
        flatShading: true
    })
    const grassLight = new THREE.MeshPhongMaterial({
        color: 0x6db84a,
        flatShading: true
    })

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

    grassGroup.position.set(x, 0, z)
    scene.add(grassGroup)
    return grassGroup
}

/**
 * 初期シーン用に地面の低い草を散布してシーンに追加する
 */
export function createGroundGrass(scene: THREE.Scene): THREE.Group[] {
    const grassPatches: THREE.Group[] = []

    // 小さな草の束を散らばせる
    for (let i = 0; i < 35; i++) {
        // 小道と木の位置を避けてランダム配置
        let gx, gz
        do {
            gx = (Math.random() - 0.5) * 7
            gz = (Math.random() - 0.5) * 7
        } while (Math.abs(gx) < 0.9 && gz > -1.0 && gz < 3.0)

        grassPatches.push(makeGrassPatch(scene, gx, gz))
    }

    return grassPatches
}
