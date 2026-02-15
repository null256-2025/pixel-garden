import * as THREE from "three"

/**
 * メインの大きな浮遊島を作成
 * 上面は緑の草地、底面は岩のような逆円錐
 */
export function createFloatingIsland(scene: THREE.Scene) {
    const group = new THREE.Group()
    group.position.set(0, 3, 0)

    // 上面 — 草地（平らな円柱）
    const topGeo = new THREE.CylinderGeometry(3.5, 3.2, 0.8, 8)
    // 頂点をランダムに揺らして自然な地形に
    const posAttr = topGeo.attributes.position
    for (let i = 0; i < posAttr.count; i++) {
        const y = posAttr.getY(i)
        if (y > 0) {
            posAttr.setX(i, posAttr.getX(i) + (Math.random() - 0.5) * 0.4)
            posAttr.setY(i, y + (Math.random() - 0.5) * 0.2)
            posAttr.setZ(i, posAttr.getZ(i) + (Math.random() - 0.5) * 0.4)
        }
    }
    topGeo.computeVertexNormals()

    const topMesh = new THREE.Mesh(
        topGeo,
        new THREE.MeshPhongMaterial({
            color: 0x4a8c3f,
            flatShading: true,
        })
    )
    topMesh.castShadow = true
    topMesh.receiveShadow = true
    group.add(topMesh)

    // 土の層
    const dirtGeo = new THREE.CylinderGeometry(3.2, 2.8, 0.6, 8)
    const dirtPositions = dirtGeo.attributes.position
    for (let i = 0; i < dirtPositions.count; i++) {
        dirtPositions.setX(i, dirtPositions.getX(i) + (Math.random() - 0.5) * 0.2)
        dirtPositions.setZ(i, dirtPositions.getZ(i) + (Math.random() - 0.5) * 0.2)
    }
    dirtGeo.computeVertexNormals()

    const dirtMesh = new THREE.Mesh(
        dirtGeo,
        new THREE.MeshPhongMaterial({
            color: 0x8B6914,
            flatShading: true,
        })
    )
    dirtMesh.position.y = -0.7
    dirtMesh.castShadow = true
    group.add(dirtMesh)

    // 底面 — 岩の逆円錐
    const rockGeo = new THREE.ConeGeometry(2.8, 3.5, 8)
    const rockPositions = rockGeo.attributes.position
    for (let i = 0; i < rockPositions.count; i++) {
        const y = rockPositions.getY(i)
        rockPositions.setX(i, rockPositions.getX(i) + (Math.random() - 0.5) * 0.5)
        rockPositions.setZ(i, rockPositions.getZ(i) + (Math.random() - 0.5) * 0.5)
        if (y < 0) {
            rockPositions.setY(i, y + (Math.random() - 0.5) * 0.3)
        }
    }
    rockGeo.computeVertexNormals()

    const rockMesh = new THREE.Mesh(
        rockGeo,
        new THREE.MeshPhongMaterial({
            color: 0x6b6b6b,
            flatShading: true,
        })
    )
    rockMesh.rotation.x = Math.PI // 逆さま
    rockMesh.position.y = -2.75
    rockMesh.castShadow = true
    group.add(rockMesh)

    scene.add(group)

    // ゆっくり上下に浮遊
    return (time: number) => {
        group.position.y = 3 + Math.sin(time * 0.5) * 0.1
    }
}
