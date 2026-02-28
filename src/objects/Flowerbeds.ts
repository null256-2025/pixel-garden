import * as THREE from "three"

// --- ネオンカラーパレット ---
const NEON_COLORS = [
    0xff00ff, // マゼンタ
    0x00ffff, // シアン
    0x00ff88, // ネオングリーン
    0xff6600, // ネオンオレンジ
    0xffff00, // ネオンイエロー
    0xff0066, // ネオンピンク
    0x6600ff, // ネオンパープル
]

function pickNeon(): number {
    return NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)]
}

// --- ネオン看板を1つ作る関数 ---
export function makeNeonSign(
    scene: THREE.Scene,
    x: number, z: number,
    signW: number, signH: number,
    rotY: number = 0
) {
    const signGroup = new THREE.Group()

    // 看板の支柱（金属ポール）
    const poleMat = new THREE.MeshPhongMaterial({
        color: 0x444455,
        flatShading: true,
    })

    const poleH = signH + 0.3
    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.04, poleH, 5),
        poleMat
    )
    pole.position.y = poleH / 2
    pole.castShadow = true
    signGroup.add(pole)

    // 看板の板面（暗い背景）
    const boardMat = new THREE.MeshPhongMaterial({
        color: 0x111118,
        flatShading: true,
    })
    const boardDepth = 0.04
    const board = new THREE.Mesh(
        new THREE.BoxGeometry(signW, signH, boardDepth),
        boardMat
    )
    board.position.set(0, poleH - signH / 2 - 0.05, 0)
    signGroup.add(board)

    // ネオンテキスト風の光るバー（看板面にネオンチューブを配置）
    const neonColor = pickNeon()
    const neonMat = new THREE.MeshPhongMaterial({
        color: neonColor,
        emissive: neonColor,
        emissiveIntensity: 1.0,
        flatShading: true,
    })

    // 横線（ネオンチューブ）を複数配置
    const tubeCount = 1 + Math.floor(Math.random() * 3)
    for (let i = 0; i < tubeCount; i++) {
        const tubeW = signW * (0.4 + Math.random() * 0.4)
        const tubeH = 0.03 + Math.random() * 0.02
        const tube = new THREE.Mesh(
            new THREE.BoxGeometry(tubeW, tubeH, boardDepth + 0.01),
            neonMat
        )
        const yPos = board.position.y - signH / 2 + signH * (i + 1) / (tubeCount + 1)
        tube.position.set(
            (Math.random() - 0.5) * (signW - tubeW) * 0.5,
            yPos,
            boardDepth / 2 + 0.005
        )
        signGroup.add(tube)
    }

    // 縦線もたまに追加
    if (Math.random() > 0.5) {
        const vTubeH = signH * (0.3 + Math.random() * 0.4)
        const vTube = new THREE.Mesh(
            new THREE.BoxGeometry(0.03, vTubeH, boardDepth + 0.01),
            neonMat
        )
        vTube.position.set(
            (Math.random() - 0.5) * signW * 0.6,
            board.position.y,
            boardDepth / 2 + 0.005
        )
        signGroup.add(vTube)
    }

    // 看板のフレーム（縁取り）
    const frameMat = new THREE.MeshPhongMaterial({
        color: neonColor,
        emissive: neonColor,
        emissiveIntensity: 0.5,
        flatShading: true,
    })
    const frameT = 0.02
    // 上辺
    signGroup.add(makeFrameBar(signW + frameT * 2, frameT, boardDepth + 0.01,
        0, board.position.y + signH / 2, 0, frameMat))
    // 下辺
    signGroup.add(makeFrameBar(signW + frameT * 2, frameT, boardDepth + 0.01,
        0, board.position.y - signH / 2, 0, frameMat))
    // 左辺
    signGroup.add(makeFrameBar(frameT, signH, boardDepth + 0.01,
        -signW / 2, board.position.y, 0, frameMat))
    // 右辺
    signGroup.add(makeFrameBar(frameT, signH, boardDepth + 0.01,
        signW / 2, board.position.y, 0, frameMat))

    // PointLight for glow effect
    const signLight = new THREE.PointLight(neonColor, 0.8, 2.5)
    signLight.position.set(0, board.position.y, boardDepth + 0.3)
    signGroup.add(signLight)

    signGroup.userData.type = 'neonsign'
    signGroup.position.set(x, 0, z)
    signGroup.rotation.y = rotY
    scene.add(signGroup)
    return signGroup
}

function makeFrameBar(w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material): THREE.Mesh {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    bar.position.set(x, y, z)
    return bar
}

/**
 * ネオン看板を複数作成してシーンに追加する
 */
export function createNeonSigns(scene: THREE.Scene): THREE.Group[] {
    const signs: THREE.Group[] = []

    // ビルの周辺に看板を配置
    signs.push(makeNeonSign(scene, -2.0, 1.5, 0.8, 0.5, 0.3))
    signs.push(makeNeonSign(scene, 2.0, 1.5, 0.6, 0.7, -0.2))
    signs.push(makeNeonSign(scene, -1.0, -3.5, 0.7, 0.4, 0.5))
    signs.push(makeNeonSign(scene, 4.0, -0.5, 0.9, 0.6, -0.4))
    signs.push(makeNeonSign(scene, -4.0, 3.5, 0.5, 0.5, 0.1))
    signs.push(makeNeonSign(scene, 1.5, 5.5, 0.8, 0.4, 0.6))
    signs.push(makeNeonSign(scene, -5.5, -1.5, 0.6, 0.6, -0.3))

    return signs
}
