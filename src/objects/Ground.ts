import * as THREE from "three"

/**
 * 地面を作成してシーンに追加する
 * 上面は芝生の緑、側面・底面は土色の6面マルチマテリアル
 */
export function createGround(scene: THREE.Scene): THREE.Object3D {

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
    return ground;
}
