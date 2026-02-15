import * as THREE from "three"

interface TreeConfig {
    x: number
    y: number
    z: number
    scale?: number
    leafColor?: number
}

/**
 * メイン島や小島に配置する木々
 */
export function createSkyTrees(scene: THREE.Scene) {
    const trunkMat = new THREE.MeshPhongMaterial({ color: 0x6b4226, flatShading: true })

    function makeTree(cfg: TreeConfig) {
        const group = new THREE.Group()
        const s = cfg.scale ?? 1
        const leafColor = cfg.leafColor ?? 0x2d8a4e

        // 幹
        const trunkGeo = new THREE.CylinderGeometry(0.06 * s, 0.1 * s, 0.5 * s, 5)
        const trunk = new THREE.Mesh(trunkGeo, trunkMat)
        trunk.position.y = 0.25 * s
        trunk.castShadow = true
        group.add(trunk)

        // 葉（3段の球で豊かなシルエット）
        const leafMat = new THREE.MeshPhongMaterial({ color: leafColor, flatShading: true })
        const layers = [
            { y: 0.6, radius: 0.35, scaleY: 0.7 },
            { y: 0.85, radius: 0.28, scaleY: 0.65 },
            { y: 1.05, radius: 0.2, scaleY: 0.6 },
        ]

        layers.forEach(layer => {
            const leafGeo = new THREE.SphereGeometry(layer.radius * s, 5, 4)
            const leaf = new THREE.Mesh(leafGeo, leafMat)
            leaf.position.y = layer.y * s
            leaf.scale.y = layer.scaleY
            leaf.castShadow = true
            group.add(leaf)
        })

        group.position.set(cfg.x, cfg.y, cfg.z)
        return group
    }

    // メイン島の上に複数本配置
    const treeConfigs: TreeConfig[] = [
        // メイン島上
        { x: -1.5, y: 3.4, z: -1.0, scale: 1.2, leafColor: 0x2d8a4e },
        { x: 2.2, y: 3.4, z: 0.8, scale: 1.0, leafColor: 0x3a9c5a },
        { x: -0.5, y: 3.4, z: 1.8, scale: 0.8, leafColor: 0x228b22 },
        { x: 1.8, y: 3.4, z: -1.5, scale: 1.4, leafColor: 0x2e7d32 },
        { x: -2.0, y: 3.4, z: 0.5, scale: 0.7, leafColor: 0x4caf50 },
        { x: 0.5, y: 3.4, z: -2.0, scale: 0.9, leafColor: 0x33691e },
        // 左手前小島に1本
        { x: -7, y: 2.6, z: 5, scale: 0.3, leafColor: 0x388e3c },
    ]

    const trees: THREE.Group[] = []
    treeConfigs.forEach(cfg => {
        const tree = makeTree(cfg)
        scene.add(tree)
        trees.push(tree)
    })

    // 微小な風揺れアニメーション
    return (time: number) => {
        trees.forEach((tree, i) => {
            tree.rotation.z = Math.sin(time * 0.8 + i * 0.7) * 0.02
        })
    }
}
