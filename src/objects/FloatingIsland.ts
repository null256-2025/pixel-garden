import * as THREE from "three"

/**
 * メインの大きな浮遊島を作成
 * 上面: 自然な草地
 * 中間〜底面: ゴツゴツした岩の段差構造（複数の岩塊を積み重ね）
 */
export function createFloatingIsland(scene: THREE.Scene) {
    const group = new THREE.Group()
    group.position.set(0, 0, 0)

    // ──────────────────────────────────────────
    // 上面 — 草地
    // ──────────────────────────────────────────
    const grassGeo = new THREE.CylinderGeometry(3.5, 3.5, 0.5, 16)
    deformVertices(grassGeo, { topOnly: true, amount: 0.2 })
    const grassMesh = new THREE.Mesh(grassGeo, new THREE.MeshPhongMaterial({
        color: 0x4a8c3f,
        flatShading: true,
    }))
    grassMesh.position.y = 0.25
    grassMesh.castShadow = true
    grassMesh.receiveShadow = true
    group.add(grassMesh)

    // ──────────────────────────────────────────
    // 岩の崖面 — 段差のある岩層を複数段で構成
    // 参考画像のように上から下へ段階的に狭くなる
    // ──────────────────────────────────────────

    // 岩層を定義: { yCenter, height, topR, bottomR, color, segments, deform }
    const rockLayers = [
        // 最上段: 草地直下の土/岩
        { y: -0.2, h: 0.4, topR: 3.5, botR: 3.3, color: 0x8B7355, seg: 12, deform: 0.2 },
        // 上段の岩
        { y: -0.55, h: 0.3, topR: 3.3, botR: 3.0, color: 0x9e8c6c, seg: 10, deform: 0.35 },
        // 中段の岩（張り出し感を出す）
        { y: -0.9, h: 0.4, topR: 3.1, botR: 2.6, color: 0x7a6b55, seg: 10, deform: 0.45 },
        // 中下段
        { y: -1.4, h: 0.6, topR: 2.7, botR: 2.0, color: 0x6b5e4a, seg: 9, deform: 0.5 },
        // 下段（大きく絞る）
        { y: -2.1, h: 0.8, topR: 2.1, botR: 1.2, color: 0x5a5044, seg: 8, deform: 0.6 },
        // 最下段（先端）
        { y: -2.9, h: 0.8, topR: 1.3, botR: 0.3, color: 0x4a433a, seg: 7, deform: 0.5 },
    ]

    rockLayers.forEach(layer => {
        const geo = new THREE.CylinderGeometry(layer.topR, layer.botR, layer.h, layer.seg)
        deformVertices(geo, { topOnly: false, amount: layer.deform })
        const mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({
            color: layer.color,
            flatShading: true,
        }))
        mesh.position.y = layer.y
        mesh.castShadow = true
        group.add(mesh)
    })

    // ──────────────────────────────────────────
    // 突き出した岩（崖面のアクセント）
    // 側面からランダムに飛び出す岩塊
    // ──────────────────────────────────────────
    const rockChunkMat = new THREE.MeshPhongMaterial({
        color: 0x7a6e5d,
        flatShading: true,
    })

    const chunkConfigs = [
        { pos: [2.8, -0.6, 1.0], scale: [0.8, 0.5, 0.6], rot: 0.3 },
        { pos: [-2.5, -1.0, -1.5], scale: [0.7, 0.6, 0.5], rot: -0.5 },
        { pos: [1.5, -1.5, -2.3], scale: [0.6, 0.7, 0.5], rot: 0.8 },
        { pos: [-1.8, -1.8, 1.8], scale: [0.5, 0.5, 0.7], rot: -0.2 },
        { pos: [2.2, -2.0, -0.8], scale: [0.5, 0.4, 0.5], rot: 1.2 },
        { pos: [-0.8, -2.4, 2.0], scale: [0.4, 0.5, 0.4], rot: 0.6 },
        { pos: [0.5, -0.5, 2.8], scale: [0.6, 0.4, 0.5], rot: -0.8 },
        { pos: [-2.8, -0.3, 0.5], scale: [0.5, 0.3, 0.6], rot: 0.4 },
    ]

    chunkConfigs.forEach(cfg => {
        const geo = new THREE.DodecahedronGeometry(0.5, 0)
        deformVertices(geo, { topOnly: false, amount: 0.15 })
        const mesh = new THREE.Mesh(geo, rockChunkMat)
        mesh.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2])
        mesh.scale.set(cfg.scale[0], cfg.scale[1], cfg.scale[2])
        mesh.rotation.y = cfg.rot
        mesh.rotation.x = (Math.random() - 0.5) * 0.3
        mesh.castShadow = true
        group.add(mesh)
    })

    // ──────────────────────────────────────────
    // 崖面の苔/草（岩の隙間に少しの緑）
    // ──────────────────────────────────────────
    const mossMat = new THREE.MeshPhongMaterial({
        color: 0x5a8a3f,
        flatShading: true,
    })
    const mossPositions = [
        [2.5, -0.3, 1.5],
        [-2.2, -0.5, -1.0],
        [1.0, -0.8, -2.5],
        [-1.5, -0.2, 2.2],
        [2.8, -0.1, -0.5],
    ]
    mossPositions.forEach(pos => {
        const geo = new THREE.SphereGeometry(0.25 + Math.random() * 0.15, 4, 3)
        const mesh = new THREE.Mesh(geo, mossMat)
        mesh.position.set(pos[0], pos[1], pos[2])
        mesh.scale.set(1.2, 0.4, 1.2)
        group.add(mesh)
    })

    // ──────────────────────────────────────────
    // 落下する小さな破片（デブリ）
    // ──────────────────────────────────────────
    const debrisGroup = new THREE.Group()
    const debrisMat = new THREE.MeshPhongMaterial({ color: 0x6b6055, flatShading: true })
    const debrisData: { mesh: THREE.Mesh; baseY: number; phase: number }[] = []

    for (let i = 0; i < 5; i++) {
        const geo = new THREE.DodecahedronGeometry(0.1 + Math.random() * 0.1, 0)
        const mesh = new THREE.Mesh(geo, debrisMat)
        const angle = Math.random() * Math.PI * 2
        const dist = 1.0 + Math.random() * 1.5
        const y = -3.5 - Math.random() * 1.5
        mesh.position.set(Math.cos(angle) * dist, y, Math.sin(angle) * dist)
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0)
        debrisGroup.add(mesh)
        debrisData.push({ mesh, baseY: y, phase: Math.random() * Math.PI * 2 })
    }
    group.add(debrisGroup)

    scene.add(group)

    // ゆっくり上下に浮遊 + デブリの回転
    return (time: number) => {
        group.position.y = Math.sin(time * 0.5) * 0.15

        debrisData.forEach(({ mesh, baseY, phase }) => {
            mesh.position.y = baseY + Math.sin(time * 0.3 + phase) * 0.1
            mesh.rotation.y = time * 0.2 + phase
        })
    }
}

// ──────────────────────────────────────────
// ヘルパー: ジオメトリの頂点をランダムに変形
// ──────────────────────────────────────────
function deformVertices(geometry: THREE.BufferGeometry, opts: { topOnly: boolean; amount: number }) {
    const pos = geometry.attributes.position
    for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i)
        if (opts.topOnly && y <= 0) continue
        pos.setX(i, pos.getX(i) + (Math.random() - 0.5) * opts.amount)
        pos.setZ(i, pos.getZ(i) + (Math.random() - 0.5) * opts.amount)
        // Y方向も少し揺らす（完全に水平でない凹凸感）
        if (!opts.topOnly) {
            pos.setY(i, y + (Math.random() - 0.5) * opts.amount * 0.3)
        }
    }
    geometry.computeVertexNormals()
}
