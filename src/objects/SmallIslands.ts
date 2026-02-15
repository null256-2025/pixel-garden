import * as THREE from "three"

interface SmallIslandConfig {
    position: THREE.Vector3
    scale: number
    phase: number
}

/**
 * 周囲に浮かぶ小さな浮遊島群（5個）
 * メイン島と同じ段差岩構造の簡略版
 */
export function createSmallIslands(scene: THREE.Scene) {
    const configs: SmallIslandConfig[] = [
        { position: new THREE.Vector3(9, 2, 4), scale: 0.4, phase: 0 },
        { position: new THREE.Vector3(-8, -1, 6), scale: 0.35, phase: 1.2 },
        { position: new THREE.Vector3(6, -1.5, -8), scale: 0.5, phase: 2.4 },
        { position: new THREE.Vector3(-7, 3, -5), scale: 0.3, phase: 3.6 },
        { position: new THREE.Vector3(11, 0.5, -2), scale: 0.25, phase: 4.8 },
    ]

    const groups: { group: THREE.Group; baseY: number; phase: number }[] = []

    configs.forEach(cfg => {
        const group = new THREE.Group()
        group.position.copy(cfg.position)
        group.scale.setScalar(cfg.scale)

        // 草地
        const topGeo = new THREE.CylinderGeometry(3, 3, 0.4, 8)
        deformVerts(topGeo, 0.2, true)
        const top = new THREE.Mesh(topGeo, new THREE.MeshPhongMaterial({
            color: 0x5a9c4f, flatShading: true
        }))
        top.position.y = 0.2
        top.castShadow = true
        top.receiveShadow = true
        group.add(top)

        // 岩層（3段）
        const layers = [
            { y: -0.15, h: 0.3, topR: 3.0, botR: 2.5, color: 0x8B7355 },
            { y: -0.55, h: 0.5, topR: 2.6, botR: 1.5, color: 0x6b5e4a },
            { y: -1.1, h: 0.6, topR: 1.6, botR: 0.3, color: 0x5a5044 },
        ]
        layers.forEach(l => {
            const geo = new THREE.CylinderGeometry(l.topR, l.botR, l.h, 7)
            deformVerts(geo, 0.3, false)
            const mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({
                color: l.color, flatShading: true
            }))
            mesh.position.y = l.y
            mesh.castShadow = true
            group.add(mesh)
        })

        // 岩塊アクセント（各島に2〜3個）
        for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2
            const dist = 1.5 + Math.random() * 1.0
            const geo = new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.2, 0)
            deformVerts(geo, 0.1, false)
            const mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({
                color: 0x7a6e5d, flatShading: true
            }))
            mesh.position.set(
                Math.cos(angle) * dist,
                -0.3 - Math.random() * 0.8,
                Math.sin(angle) * dist
            )
            mesh.scale.set(0.8, 0.5, 0.8)
            mesh.rotation.y = Math.random() * Math.PI
            mesh.castShadow = true
            group.add(mesh)
        }

        scene.add(group)
        groups.push({ group, baseY: cfg.position.y, phase: cfg.phase })
    })

    return (time: number) => {
        groups.forEach(({ group, baseY, phase }) => {
            group.position.y = baseY + Math.sin(time * 0.4 + phase) * 0.2
        })
    }
}

function deformVerts(geometry: THREE.BufferGeometry, amount: number, topOnly: boolean) {
    const pos = geometry.attributes.position
    for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i)
        if (topOnly && y <= 0) continue
        pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * amount)
        pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * amount)
        if (!topOnly) {
            pos.setY(i, y + (Math.random() - 0.5) * amount * 0.3)
        }
    }
    geometry.computeVertexNormals()
}
