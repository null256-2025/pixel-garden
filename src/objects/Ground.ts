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
    const dirtColor = new THREE.Color(0x8B6914);

    const grassMat = new THREE.MeshPhongMaterial({
        color: 0xffffff, // White so vertex colors aren't tinted
        vertexColors: true,
        flatShading: true
    })

    const dirtMat = new THREE.MeshPhongMaterial({
        color: dirtColor, // 側面・底面: 土色
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

    // Subdivide the top face into a grid for terrain sculpting
    const segments = 32;
    const groundGeo = new THREE.BoxGeometry(groundSize, groundHeight, groundSize, segments, 1, segments);

    // Convert to non-indexed geometry so flatShading works perfectly with displaced vertices
    const nonIndexedGeo = groundGeo.toNonIndexed();

    // Setup vertex colors
    const posAttr = nonIndexedGeo.attributes.position;
    const colors = new Float32Array(posAttr.count * 3);
    const cGrass = new THREE.Color(0x5a9a3c);

    // Default top-face to green, others no vertex color needed but we give them white so they don't block
    for (let i = 0; i < posAttr.count; i++) {
        if (posAttr.getY(i) > 0) {
            colors[i * 3 + 0] = cGrass.r;
            colors[i * 3 + 1] = cGrass.g;
            colors[i * 3 + 2] = cGrass.b;
        } else {
            colors[i * 3 + 0] = 1.0;
            colors[i * 3 + 1] = 1.0;
            colors[i * 3 + 2] = 1.0;
        }
    }
    nonIndexedGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const ground = new THREE.Mesh(nonIndexedGeo, groundMaterials)
    ground.position.y = -groundHeight / 2 // 上面がちょうど y=0 になるように
    ground.receiveShadow = true
    ground.castShadow = false
    scene.add(ground)
    return ground;
}
