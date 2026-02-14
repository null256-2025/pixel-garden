import * as THREE from "three"

/**
 * 夜の地面を作成してシーンに追加する
 * 月明かりに照らされて見える程度の暗さ
 */
export function createGround(scene: THREE.Scene) {

    const groundSize = 12
    const groundHeight = 0.3

    const topMat = new THREE.MeshPhongMaterial({
        color: 0x2a5a2a, // 月明かりで見える暗めの草色
        flatShading: true,
    })
    const sideMat = new THREE.MeshPhongMaterial({
        color: 0x2a3a1a, // 土色（やや明るく）
        flatShading: true,
    })

    const groundMaterials = [
        sideMat, // +X
        sideMat, // -X
        topMat,  // +Y（上面）
        sideMat, // -Y
        sideMat, // +Z
        sideMat, // -Z
    ]

    const groundGeo = new THREE.BoxGeometry(groundSize, groundHeight, groundSize)
    const ground = new THREE.Mesh(groundGeo, groundMaterials)
    ground.position.y = -groundHeight / 2
    ground.receiveShadow = true
    ground.castShadow = false
    scene.add(ground)
}
