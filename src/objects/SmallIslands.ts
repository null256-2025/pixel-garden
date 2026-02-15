import * as THREE from "three"

interface SmallIslandConfig {
    position: THREE.Vector3
    scale: number
    phase: number
}

/**
 * 周囲に浮かぶ小さな浮遊島群（5個）
 */
export function createSmallIslands(scene: THREE.Scene) {
    const configs: SmallIslandConfig[] = [
        { position: new THREE.Vector3(8, 4.5, 3), scale: 0.4, phase: 0 },
        { position: new THREE.Vector3(-7, 2.5, 5), scale: 0.35, phase: 1.2 },
        { position: new THREE.Vector3(5, 1.5, -7), scale: 0.5, phase: 2.4 },
        { position: new THREE.Vector3(-6, 5, -4), scale: 0.3, phase: 3.6 },
        { position: new THREE.Vector3(10, 3, -3), scale: 0.25, phase: 4.8 },
    ]

    const groups: { group: THREE.Group; baseY: number; phase: number }[] = []

    configs.forEach(cfg => {
        const group = new THREE.Group()
        group.position.copy(cfg.position)
        group.scale.setScalar(cfg.scale)

        // 上面（草地）
        const topGeo = new THREE.CylinderGeometry(3, 2.8, 0.6, 6)
        const posAttr = topGeo.attributes.position
        for (let i = 0; i < posAttr.count; i++) {
            posAttr.setX(i, posAttr.getX(i) + (Math.random() - 0.5) * 0.3)
            posAttr.setZ(i, posAttr.getZ(i) + (Math.random() - 0.5) * 0.3)
        }
        topGeo.computeVertexNormals()

        group.add(new THREE.Mesh(
            topGeo,
            new THREE.MeshPhongMaterial({ color: 0x5a9c4f, flatShading: true })
        ))

        // 底面（岩）
        const rockGeo = new THREE.ConeGeometry(2.5, 3, 6)
        const rockPos = rockGeo.attributes.position
        for (let i = 0; i < rockPos.count; i++) {
            rockPos.setX(i, rockPos.getX(i) + (Math.random() - 0.5) * 0.4)
            rockPos.setZ(i, rockPos.getZ(i) + (Math.random() - 0.5) * 0.4)
        }
        rockGeo.computeVertexNormals()

        const rock = new THREE.Mesh(
            rockGeo,
            new THREE.MeshPhongMaterial({ color: 0x7a7a7a, flatShading: true })
        )
        rock.rotation.x = Math.PI
        rock.position.y = -1.8
        group.add(rock)

        group.children.forEach(c => {
            c.castShadow = true
            c.receiveShadow = true
        })

        scene.add(group)
        groups.push({ group, baseY: cfg.position.y, phase: cfg.phase })
    })

    return (time: number) => {
        groups.forEach(({ group, baseY, phase }) => {
            group.position.y = baseY + Math.sin(time * 0.4 + phase) * 0.15
        })
    }
}
