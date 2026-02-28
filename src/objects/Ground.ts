import * as THREE from "three"

/**
 * ネオンシティの台座（地面）を作成してシーンに追加する
 * - ダークアスファルトの上面
 * - コンクリート風の側面
 * - 台座の縁にオレンジのエッジグロー
 */
export function createGround(scene: THREE.Scene): THREE.Object3D {

    const groundSize = 14
    const groundHeight = 0.4

    // ===== 台座本体 =====
    const concreteSideColor = new THREE.Color(0x2a2a3e)

    const asphaltMat = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        vertexColors: true,
        flatShading: true
    })

    const concreteMat = new THREE.MeshPhongMaterial({
        color: concreteSideColor,
        flatShading: true
    })

    const groundMaterials = [
        concreteMat, // +X
        concreteMat, // -X
        asphaltMat,  // +Y 上面
        concreteMat, // -Y
        concreteMat, // +Z
        concreteMat  // -Z
    ]

    const segments = 32
    const groundGeo = new THREE.BoxGeometry(groundSize, groundHeight, groundSize, segments, 1, segments)
    const nonIndexedGeo = groundGeo.toNonIndexed()

    // 上面の頂点カラーをダークアスファルトに
    const posAttr = nonIndexedGeo.attributes.position
    const colors = new Float32Array(posAttr.count * 3)
    const cAsphalt = new THREE.Color(0x1a1a2e)

    for (let i = 0; i < posAttr.count; i++) {
        if (posAttr.getY(i) > 0) {
            colors[i * 3 + 0] = cAsphalt.r
            colors[i * 3 + 1] = cAsphalt.g
            colors[i * 3 + 2] = cAsphalt.b
        } else {
            colors[i * 3 + 0] = 1.0
            colors[i * 3 + 1] = 1.0
            colors[i * 3 + 2] = 1.0
        }
    }
    nonIndexedGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const ground = new THREE.Mesh(nonIndexedGeo, groundMaterials)
    ground.position.y = -groundHeight / 2
    ground.receiveShadow = true
    ground.castShadow = false
    scene.add(ground)

    // ===== エッジグロー（台座の縁にオレンジの光帯） =====
    const edgeGlowMat = new THREE.MeshPhongMaterial({
        color: 0xff8844,
        emissive: 0xff6622,
        emissiveIntensity: 0.6,
        flatShading: true,
        transparent: true,
        opacity: 0.8,
    })

    const edgeThickness = 0.08
    const edgeHeight = 0.06
    const halfSize = groundSize / 2

    // 4辺のエッジグロー帯
    const edges = [
        { w: groundSize + edgeThickness * 2, d: edgeThickness, x: 0, z: halfSize },   // +Z
        { w: groundSize + edgeThickness * 2, d: edgeThickness, x: 0, z: -halfSize },  // -Z
        { w: edgeThickness, d: groundSize, x: halfSize, z: 0 },   // +X
        { w: edgeThickness, d: groundSize, x: -halfSize, z: 0 },  // -X
    ]

    for (const e of edges) {
        const edgeMesh = new THREE.Mesh(
            new THREE.BoxGeometry(e.w, edgeHeight, e.d),
            edgeGlowMat
        )
        edgeMesh.position.set(e.x, edgeHeight / 2 - 0.01, e.z)
        scene.add(edgeMesh)
    }

    return ground
}
