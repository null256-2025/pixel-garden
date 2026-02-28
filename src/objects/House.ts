import * as THREE from "three"

// =============================================
//  ネオンシティ ビル生成モジュール
//  参考画像テイスト: ダーク壁面 + 暖色窓 + 大型ネオンパネル
// =============================================

// --- カラーパレット ---
const WARM_WINDOW_COLORS = [
    0xffcc33, // ウォームイエロー
    0xffaa22, // オレンジイエロー
    0xffe066, // ライトイエロー
    0xff9933, // オレンジ
]

const NEON_ACCENT_COLORS = [
    0x00ff88, // ネオングリーン
    0xff00ff, // マゼンタ
    0x00ffff, // シアン
    0xff0066, // ネオンピンク
    0x6600ff, // ネオンパープル
    0xff8833, // ネオンオレンジ
    0xffff00, // ネオンイエロー
]

function pickWarmWindow(): number {
    return WARM_WINDOW_COLORS[Math.floor(Math.random() * WARM_WINDOW_COLORS.length)]
}

function pickNeon(): number {
    return NEON_ACCENT_COLORS[Math.floor(Math.random() * NEON_ACCENT_COLORS.length)]
}

// --- 壁面マテリアル生成 ---
function makeWallMaterial(): THREE.MeshPhongMaterial {
    const base = 0x2a2a3a
    const variation = Math.floor(Math.random() * 0x101018)
    return new THREE.MeshPhongMaterial({
        color: base + variation,
        flatShading: true,
    })
}

// --- 窓を壁面に配置（参考画像風：大小さまざま、暖色メイン） ---
function addWindows(
    group: THREE.Group,
    bw: number, bh: number, bd: number,
    faceAxis: 'x' | 'z',
    neonColor: number,
) {
    // 窓の縦列を作成（大小ランダム）
    const faceSize = faceAxis === 'z' ? bw : bd
    const numCols = Math.max(1, Math.floor(faceSize / 0.55))
    const numRows = Math.max(1, Math.floor(bh / 0.6))

    const colSpacing = faceSize / (numCols + 1)
    const rowSpacing = bh / (numRows + 1.5)

    for (let c = 0; c < numCols; c++) {
        for (let r = 0; r < numRows; r++) {
            // 窓のサイズ（大小ランダム）
            const isLarge = Math.random() > 0.7
            const winW = isLarge ? 0.3 + Math.random() * 0.15 : 0.15 + Math.random() * 0.1
            const winH = isLarge ? 0.35 + Math.random() * 0.15 : 0.18 + Math.random() * 0.1
            const depth = 0.03

            // 点灯状態
            const roll = Math.random()
            let winColor: number
            let emissiveColor: number
            let intensity: number

            if (roll < 0.45) {
                // 暖色点灯（メイン）
                winColor = pickWarmWindow()
                emissiveColor = winColor
                intensity = 0.3 + Math.random() * 0.3
            } else if (roll < 0.6) {
                // ネオン色の窓（少数）
                winColor = neonColor
                emissiveColor = neonColor
                intensity = 0.2 + Math.random() * 0.2
            } else {
                // 消灯
                winColor = 0x161622
                emissiveColor = 0x000000
                intensity = 0
            }

            const winMat = new THREE.MeshPhongMaterial({
                color: winColor,
                emissive: emissiveColor,
                emissiveIntensity: intensity,
                flatShading: true,
            })

            const winGeo = new THREE.BoxGeometry(
                faceAxis === 'z' ? winW : depth,
                winH,
                faceAxis === 'z' ? depth : winW
            )

            const halfFace = faceSize / 2
            const posAlong = -halfFace + colSpacing * (c + 1)
            const posY = 0.5 + r * rowSpacing

            if (posY > bh - 0.2) continue

            for (const sign of [1, -1]) {
                const win = new THREE.Mesh(winGeo, winMat)
                if (faceAxis === 'z') {
                    win.position.set(posAlong, posY, sign * (bd / 2 + depth / 2))
                } else {
                    win.position.set(sign * (bw / 2 + depth / 2), posY, posAlong)
                }
                group.add(win)
            }
        }
    }
}

// --- ネオンパネル（壁面に大きな光の帯） ---
function addNeonPanel(
    group: THREE.Group,
    bw: number, bh: number, bd: number,
    neonColor: number,
    faceAxis: 'x' | 'z',
    vertical: boolean = true
) {
    const mat = new THREE.MeshPhongMaterial({
        color: neonColor,
        emissive: neonColor,
        emissiveIntensity: 0.5,
        flatShading: true,
        transparent: true,
        opacity: 0.9,
    })

    if (vertical) {
        // 縦ストライプ（壁面の高さの60〜80%）
        const stripeH = bh * (0.6 + Math.random() * 0.2)
        const stripeW = 0.12 + Math.random() * 0.08
        const offsetX = (Math.random() - 0.5) * (faceAxis === 'z' ? bw * 0.4 : 0)
        const offsetZ = (Math.random() - 0.5) * (faceAxis === 'x' ? bd * 0.4 : 0)

        for (const sign of [1, -1]) {
            const stripe = new THREE.Mesh(
                new THREE.BoxGeometry(
                    faceAxis === 'z' ? stripeW : 0.03,
                    stripeH,
                    faceAxis === 'z' ? 0.03 : stripeW
                ),
                mat
            )
            if (faceAxis === 'z') {
                stripe.position.set(offsetX, bh * 0.5, sign * (bd / 2 + 0.02))
            } else {
                stripe.position.set(sign * (bw / 2 + 0.02), bh * 0.5, offsetZ)
            }
            group.add(stripe)
        }
    } else {
        // 水平アクセントライン
        const lineW = faceAxis === 'z' ? bw * 0.8 : 0.03
        const lineD = faceAxis === 'z' ? 0.03 : bd * 0.8
        const posY = bh * (0.7 + Math.random() * 0.2)

        for (const sign of [1, -1]) {
            const line = new THREE.Mesh(
                new THREE.BoxGeometry(lineW, 0.05, lineD),
                mat
            )
            if (faceAxis === 'z') {
                line.position.set(0, posY, sign * (bd / 2 + 0.02))
            } else {
                line.position.set(sign * (bw / 2 + 0.02), posY, 0)
            }
            group.add(line)
        }
    }
}

// --- 屋上ディテール ---
function addRooftop(group: THREE.Group, w: number, d: number, h: number) {
    const detailMat = new THREE.MeshPhongMaterial({
        color: 0x333344,
        flatShading: true,
    })

    // アンテナ（赤ライト付き）
    if (Math.random() > 0.3) {
        const antennaH = 0.4 + Math.random() * 0.5
        const antenna = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, antennaH, 4),
            detailMat
        )
        const ax = (Math.random() - 0.5) * w * 0.5
        const az = (Math.random() - 0.5) * d * 0.5
        antenna.position.set(ax, h + antennaH / 2, az)
        group.add(antenna)

        // 先端の赤/ピンクライト
        const tipColor = Math.random() > 0.5 ? 0xff3333 : 0xff66aa
        const tipMat = new THREE.MeshPhongMaterial({
            color: tipColor,
            emissive: tipColor,
            emissiveIntensity: 0.6,
            flatShading: true,
        })
        const tip = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 4, 4),
            tipMat
        )
        tip.position.set(ax, h + antennaH, az)
        group.add(tip)
    }

    // 室外機ボックス
    if (Math.random() > 0.4) {
        const acBox = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.2, 0.3),
            detailMat
        )
        acBox.position.set(
            (Math.random() - 0.5) * w * 0.5,
            h + 0.1,
            (Math.random() - 0.5) * d * 0.5
        )
        group.add(acBox)
    }

    // 屋上のフチ（パラペット）
    const parapetMat = new THREE.MeshPhongMaterial({
        color: 0x2e2e40,
        flatShading: true,
    })
    const parapetH = 0.06
    const parapetT = 0.06
    // 4辺
    const parapets = [
        { pw: w + parapetT, pd: parapetT, px: 0, pz: d / 2 },
        { pw: w + parapetT, pd: parapetT, px: 0, pz: -d / 2 },
        { pw: parapetT, pd: d, px: w / 2, pz: 0 },
        { pw: parapetT, pd: d, px: -w / 2, pz: 0 },
    ]
    for (const p of parapets) {
        const par = new THREE.Mesh(
            new THREE.BoxGeometry(p.pw, parapetH, p.pd),
            parapetMat
        )
        par.position.set(p.px, h + parapetH / 2, p.pz)
        group.add(par)
    }
}

// =============================================
//  ビルタイプ 1: TallTower（大型高層タワー）
//  W×D: 3×3, H: 7.0, ネオン: グリーン
// =============================================
export function makeTallTower(
    scene: THREE.Scene,
    x: number, z: number
): THREE.Group {
    const group = new THREE.Group()

    const w = 3, d = 3, h = 7

    // ビル本体
    const wallMat = makeWallMaterial()
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        wallMat
    )
    body.position.y = h / 2
    body.castShadow = true
    body.receiveShadow = true
    group.add(body)

    // 窓（4面）
    const neonColor = 0x00ff88 // グリーン
    addWindows(group, w, h, d, 'z', neonColor)
    addWindows(group, w, h, d, 'x', neonColor)

    // ネオンパネル — 前後面に大きな縦ストライプ
    addNeonPanel(group, w, h, d, neonColor, 'z', true)
    // 側面に水平アクセント
    addNeonPanel(group, w, h, d, neonColor, 'x', false)

    // 屋上
    addRooftop(group, w, d, h)

    group.position.set(x, 0, z)
    scene.add(group)
    return group
}

// === 他のビルタイプは今後追加 ===
// makeTallTower のみ先行実装
