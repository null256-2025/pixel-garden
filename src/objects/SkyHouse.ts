import * as THREE from "three"

/**
 * メイン島の上に建つ小さな家
 */
export function createSkyHouse(scene: THREE.Scene) {
    const group = new THREE.Group()
    // メイン島の上面に配置
    group.position.set(0.8, 3.6, -0.5)

    const wallMat = new THREE.MeshPhongMaterial({ color: 0xf5e6c8, flatShading: true })
    const roofMat = new THREE.MeshPhongMaterial({ color: 0x8B4513, flatShading: true })
    const doorMat = new THREE.MeshPhongMaterial({ color: 0x654321, flatShading: true })
    const windowMat = new THREE.MeshPhongMaterial({ color: 0x2a1a0a, flatShading: true })

    // 壁
    const wallGeo = new THREE.BoxGeometry(1.2, 0.9, 1.0)
    const wall = new THREE.Mesh(wallGeo, wallMat)
    wall.position.y = 0.45
    wall.castShadow = true
    wall.receiveShadow = true
    group.add(wall)

    // 屋根（三角形のプリズム）
    const roofShape = new THREE.Shape()
    roofShape.moveTo(-0.75, 0)
    roofShape.lineTo(0.75, 0)
    roofShape.lineTo(0, 0.6)
    roofShape.lineTo(-0.75, 0)
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
        depth: 1.2,
        bevelEnabled: false,
    })
    const roof = new THREE.Mesh(roofGeo, roofMat)
    roof.position.set(0, 0.9, -0.6)
    roof.castShadow = true
    group.add(roof)

    // ドア
    const doorGeo = new THREE.BoxGeometry(0.25, 0.45, 0.05)
    const door = new THREE.Mesh(doorGeo, doorMat)
    door.position.set(-0.15, 0.225, 0.53)
    group.add(door)

    // 窓（2つ）
    const windowGeo = new THREE.BoxGeometry(0.2, 0.2, 0.05)
    const win1 = new THREE.Mesh(windowGeo, windowMat)
    win1.position.set(0.3, 0.55, 0.53)
    group.add(win1)

    const win2 = new THREE.Mesh(windowGeo, windowMat)
    win2.position.set(-0.3, 0.55, -0.53)
    group.add(win2)

    // 煙突
    const chimneyGeo = new THREE.BoxGeometry(0.2, 0.5, 0.2)
    const chimney = new THREE.Mesh(chimneyGeo, new THREE.MeshPhongMaterial({
        color: 0x994444,
        flatShading: true,
    }))
    chimney.position.set(0.35, 1.3, 0.1)
    chimney.castShadow = true
    group.add(chimney)

    scene.add(group)
}
