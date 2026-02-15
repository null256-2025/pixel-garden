import * as THREE from "three"

/**
 * 小島の1つに配置する風車
 * 石造りの塔 + 回転する4枚羽根
 * 小島3（6, -1.5, -8, scale=0.5）に配置
 */
export function createWindmill(scene: THREE.Scene) {
    const group = new THREE.Group()
    // 小島3の上面に配置。小島のワールド座標 (6, -1.5, -8)、scale=0.5
    // 小島の上面ローカルy≈0.6 → ワールドy ≈ -1.5 + 0.6*0.5 = -1.2
    group.position.set(6, -1.2, -8)
    group.scale.setScalar(0.5) // 小島のスケールに合わせる

    const stoneMat = new THREE.MeshPhongMaterial({ color: 0x9e9e9e, flatShading: true })
    const woodMat = new THREE.MeshPhongMaterial({ color: 0x8d6e63, flatShading: true })
    const roofMat = new THREE.MeshPhongMaterial({ color: 0x6d4c41, flatShading: true })

    // 塔（円柱、上に向かって細くなる）
    const towerGeo = new THREE.CylinderGeometry(0.25, 0.4, 1.5, 6)
    const tower = new THREE.Mesh(towerGeo, stoneMat)
    tower.position.y = 0.75
    tower.castShadow = true
    group.add(tower)

    // 屋根（円錐）
    const roofGeo = new THREE.ConeGeometry(0.35, 0.35, 6)
    const roof = new THREE.Mesh(roofGeo, roofMat)
    roof.position.y = 1.7
    roof.castShadow = true
    group.add(roof)

    // 羽根（4枚の薄い板を十字型）
    const bladesGroup = new THREE.Group()
    bladesGroup.position.set(0, 1.2, 0.42)

    for (let i = 0; i < 4; i++) {
        const bladeGeo = new THREE.BoxGeometry(0.08, 0.7, 0.02)
        const blade = new THREE.Mesh(bladeGeo, woodMat)
        blade.position.y = 0.35
        blade.castShadow = true

        const pivot = new THREE.Group()
        pivot.add(blade)
        pivot.rotation.z = (Math.PI / 2) * i
        bladesGroup.add(pivot)
    }

    // 中心軸
    const axleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.12, 4)
    const axle = new THREE.Mesh(axleGeo, woodMat)
    axle.rotation.x = Math.PI / 2
    bladesGroup.add(axle)

    group.add(bladesGroup)
    scene.add(group)

    return (time: number) => {
        bladesGroup.rotation.z = time * 0.8
    }
}
