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
    const base = 0x242434 // 固定のダークネイビー色に統一
    return new THREE.MeshPhongMaterial({
        color: base,
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
                intensity = 0.6 + Math.random() * 0.4 // 発光を強める
            } else if (roll < 0.6) {
                // ネオン色の窓（少数）
                winColor = neonColor
                emissiveColor = neonColor
                intensity = 0.5 + Math.random() * 0.5 // 発光を強める
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



// --- 屋上ディテール ---
function addRooftop(group: THREE.Group, w: number, d: number, h: number) {
    const detailMat = new THREE.MeshPhongMaterial({
        color: 0x333344,
        flatShading: true,
    })

    // 屋上ディテールに複数配置できるよう分離
    // アンテナ（赤ライト付き）
    if (Math.random() > 0.3) {
        addAntenna(group, w, d, h, detailMat)
    }

    // 基本的に1つ載せる
    if (Math.random() > 0.2) {
        addAcBox(group, w, d, h, detailMat)
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

function addAntenna(group: THREE.Group, w: number, d: number, h: number, detailMat: THREE.Material) {
    const antennaH = 0.4 + Math.random() * 0.5
    const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, antennaH, 4),
        detailMat
    )
    const ax = (Math.random() - 0.5) * w * 0.6
    const az = (Math.random() - 0.5) * d * 0.6
    antenna.position.set(ax, h + antennaH / 2, az)
    group.add(antenna)

    const tipColor = Math.random() > 0.5 ? 0xff3333 : 0xff66aa
    const tipMat = new THREE.MeshPhongMaterial({
        color: tipColor,
        emissive: tipColor,
        emissiveIntensity: 0.8,
        flatShading: true,
    })
    const tip = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 4, 4),
        tipMat
    )
    tip.position.set(ax, h + antennaH, az)
    group.add(tip)
}

function addAcBox(group: THREE.Group, w: number, d: number, h: number, detailMat: THREE.Material) {
    const boxW = 0.3 + Math.random() * 0.2
    const boxH = 0.15 + Math.random() * 0.15
    const boxD = 0.25 + Math.random() * 0.2
    const acBox = new THREE.Mesh(
        new THREE.BoxGeometry(boxW, boxH, boxD),
        detailMat
    )
    acBox.position.set(
        (Math.random() - 0.5) * w * 0.7,
        h + boxH / 2,
        (Math.random() - 0.5) * d * 0.7
    )
    acBox.rotation.y = Math.random() * Math.PI / 2
    group.add(acBox)
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

    // 屋上
    addRooftop(group, w, d, h)
    addRooftop(group, w, d, h)

    group.position.set(x, 0, z)
    scene.add(group)
    return group
}

// =============================================
//  ビルタイプ 2: SlimTower（細長いタワー）
//  W×D: 1.5×1.5, H: 6.0, ネオン: シアン
// =============================================
export function makeSlimTower(
    scene: THREE.Scene,
    x: number, z: number
): THREE.Group {
    const group = new THREE.Group()

    const w = 1.5, d = 1.5, h = 6.0

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
    const neonColor = 0x00ffff // シアン
    addWindows(group, w, h, d, 'z', neonColor)
    addWindows(group, w, h, d, 'x', neonColor)
    addWindows(group, w, h, d, 'z', neonColor) // 裏面
    addWindows(group, w, h, d, 'x', neonColor) // 右面

    // 屋上（細いのでアンテナを高確率に）
    addRooftop(group, w, d, h)

    group.position.set(x, 0, z)
    scene.add(group)
    return group
}

// =============================================
//  ビルタイプ 3: WideLow（横に広い低層）
//  W×D: 4.0×2.5, H: 2.0, ネオン: オレンジ
// =============================================
export function makeWideLow(
    scene: THREE.Scene,
    x: number, z: number
): THREE.Group {
    const group = new THREE.Group()

    const w = 4.0, d = 2.5, h = 2.0

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
    const neonColor = 0xff8833 // オレンジ
    addWindows(group, w, h, d, 'z', neonColor)
    addWindows(group, w, h, d, 'x', neonColor)

    // 屋上（広いので室外機を複数）
    addRooftop(group, w, d, h)

    const detailMat = new THREE.MeshPhongMaterial({ color: 0x333344, flatShading: true })
    const numAcBoxes = 2 + Math.floor(Math.random() * 4) // 2〜5個
    for (let i = 0; i < numAcBoxes; i++) {
        addAcBox(group, w, d, h, detailMat)
    }

    if (Math.random() > 0.5) {
        addAntenna(group, w, d, h, detailMat)
    }

    group.position.set(x, 0, z)
    scene.add(group)
    return group
}

// =============================================
//  ビルタイプ 4: MediumA（標準中層ビル）
//  W×D: 2.0×2.0, H: 4.0, ネオン: マゼンタ
// =============================================
export function makeMediumA(
    scene: THREE.Scene,
    x: number, z: number
): THREE.Group {
    const group = new THREE.Group()

    const w = 2.0, d = 2.0, h = 4.0

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

    // 窓
    const neonColor = 0xff00ff // マゼンタ
    addWindows(group, w, h, d, 'z', neonColor)
    addWindows(group, w, h, d, 'x', neonColor)
    addWindows(group, w, h, d, 'z', neonColor)
    addWindows(group, w, h, d, 'x', neonColor)

    // 屋上（標準的）
    addRooftop(group, w, d, h)

    addRooftop(group, w, d, h)

    group.position.set(x, 0, z)
    scene.add(group)
    return group
}

// =============================================
//  ビルタイプ 5: MediumB（パノラマ窓風・窓多めの中層）
//  W×D: 2.5×2.0, H: 4.0, ネオン: 黄
// =============================================
export function makeMediumB(
    scene: THREE.Scene,
    x: number, z: number
): THREE.Group {
    const group = new THREE.Group()

    const w = 2.5, d = 2.0, h = 4.0

    const wallMat = makeWallMaterial()
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat)
    body.position.y = h / 2
    body.castShadow = true
    body.receiveShadow = true
    group.add(body)

    const neonColor = 0xffff00 // イエロー
    // 窓を少し密集させるために addWindows を重ねがけするアプローチ
    addWindows(group, w, h, d, 'z', neonColor)
    addWindows(group, w, h, d, 'x', neonColor)

    // ちょっと位置をずらしてもう一度窓を追加（窓の密度を上げる）
    const tempGroup = new THREE.Group()
    addWindows(tempGroup, w, h, d, 'z', neonColor)
    tempGroup.position.set(0, 0.2, 0)
    group.add(tempGroup)

    addRooftop(group, w, d, h)
    group.position.set(x, 0, z)
    scene.add(group)
    return group
}

// =============================================
//  ビルタイプ 6: ShopFront（1Fが店舗風の低〜中層）
//  W×D: 3.0×2.0, H: 2.5, ネオン: ピンク
// =============================================
export function makeShopFront(
    scene: THREE.Scene,
    x: number, z: number
): THREE.Group {
    const group = new THREE.Group()

    const w = 3.0, d = 2.0, h = 2.5

    const wallMat = makeWallMaterial()
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat)
    body.position.y = h / 2
    body.castShadow = true
    body.receiveShadow = true
    group.add(body)

    const neonColor = 0xff0066 // ピンク

    // 2F以上の窓
    // 窓の開始位置を上げるために、一旦グループで作成してから上にスライドさせる（はみ出しを防ぐため行数を減らすなど本来は必要だが、簡単なYシフトで対応。ただしビル高さを超えないよう計算）
    // ShopFront は高さ 2.5。1F部分に 1.0 使うので、窓は y=1.0〜2.5 に収めたい。
    // そのため bh を 1.5 として窓を生成する。
    const winGroup = new THREE.Group()
    addWindows(winGroup, w, 1.5, d, 'z', neonColor)
    addWindows(winGroup, w, 1.5, d, 'x', neonColor)
    winGroup.position.y = 1.0 // 1Fの分持ち上げる
    group.add(winGroup)

    // 1Fの店舗部分（光る帯を看板に見立てる）
    const signMat = new THREE.MeshPhongMaterial({
        color: neonColor, emissive: neonColor, emissiveIntensity: 0.6, flatShading: true
    })
    const signBox = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.4, d + 0.05), signMat)
    signBox.position.set(0, 0.7, 0)
    group.add(signBox)

    // ショーウィンドウ（1F）
    const showWindowMat = new THREE.MeshPhongMaterial({
        color: 0xffddaa, emissive: 0xffddaa, emissiveIntensity: 0.5, flatShading: true
    })
    const showWindow = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.6, d + 0.02), showWindowMat)
    showWindow.position.set(0, 0.3, 0)
    group.add(showWindow)

    addRooftop(group, w, d, h)

    group.position.set(x, 0, z)
    scene.add(group)
    return group
}

// =============================================
//  ビルタイプ 7: OfficeBlock（正方形の少し高めオフィス）
//  W×D: 2.5×2.5, H: 5.0, ネオン: 紫
// =============================================
export function makeOfficeBlock(
    scene: THREE.Scene,
    x: number, z: number
): THREE.Group {
    const group = new THREE.Group()

    const w = 2.5, d = 2.5, h = 5.0

    const wallMat = makeWallMaterial()
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat)
    body.position.y = h / 2
    body.castShadow = true
    body.receiveShadow = true
    group.add(body)

    const neonColor = 0x6600ff // パープル
    addWindows(group, w, h, d, 'z', neonColor)
    addWindows(group, w, h, d, 'x', neonColor)
    addWindows(group, w, h, d, 'z', neonColor)
    addWindows(group, w, h, d, 'x', neonColor)

    // 上部に紫の光るラインを1周巻く
    const lineMat = new THREE.MeshPhongMaterial({
        color: neonColor, emissive: neonColor, emissiveIntensity: 0.7, flatShading: true
    })
    const lineBox = new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, 0.1, d + 0.05), lineMat)
    lineBox.position.set(0, h + 0.05, 0) // 屋上の少し上（パラペットと同等の高さ）に配置
    group.add(lineBox)

    addRooftop(group, w, d, h)
    // 室外機追加
    const detailMat = new THREE.MeshPhongMaterial({ color: 0x333344, flatShading: true })
    addAcBox(group, w, d, h, detailMat)
    addAcBox(group, w, d, h, detailMat)

    group.position.set(x, 0, z)
    scene.add(group)
    return group
}

// =============================================
//  ビルタイプ 8: Apartment（集合住宅風）
//  W×D: 2.0×3.0, H: 3.5, ネオン: 暖白（なし）
// =============================================
export function makeApartment(
    scene: THREE.Scene,
    x: number, z: number
): THREE.Group {
    const group = new THREE.Group()
    const w = 2.0, d = 3.0, h = 3.5

    const wallMat = makeWallMaterial()
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat)
    body.position.y = h / 2
    body.castShadow = true
    body.receiveShadow = true
    group.add(body)

    const neonColor = 0xffeedd
    addWindows(group, w, h, d, 'z', neonColor)
    addWindows(group, w, h, d, 'x', neonColor)

    addRooftop(group, w, d, h)
    group.position.set(x, 0, z)
    scene.add(group)
    return group
}

// =============================================
//  ビルタイプ 9: MiniBox（小さな箱ビル）
//  W×D: 1.5×1.0, H: 1.5, ネオン: シアン
// =============================================
export function makeMiniBox(
    scene: THREE.Scene,
    x: number, z: number
): THREE.Group {
    const group = new THREE.Group()
    const w = 1.5, d = 1.0, h = 1.5

    const wallMat = makeWallMaterial()
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat)
    body.position.y = h / 2
    body.castShadow = true
    body.receiveShadow = true
    group.add(body)

    const neonColor = 0x00ffff
    addWindows(group, w, h, d, 'z', neonColor)
    addWindows(group, w, h, d, 'x', neonColor)

    addRooftop(group, w, d, h)
    group.position.set(x, 0, z)
    scene.add(group)
    return group
}

// =============================================
//  ビルタイプ 10: CornerBldg（角地ビル、L字の代わりに四角形だが角地用）
//  W×D: 2.0×2.0, H: 4.5, ネオン: マゼンタ+緑
// =============================================
export function makeCornerBldg(
    scene: THREE.Scene,
    x: number, z: number
): THREE.Group {
    const group = new THREE.Group()
    const w = 2.0, d = 2.0, h = 4.5

    const wallMat = makeWallMaterial()
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat)
    body.position.y = h / 2
    body.castShadow = true
    body.receiveShadow = true
    group.add(body)

    const neonColor = 0x00ff88
    addWindows(group, w, h, d, 'z', neonColor)
    addWindows(group, w, h, d, 'x', 0xff00ff) // 面によってネオンの色を変える

    // 上部にネオンライン
    const lineMat = new THREE.MeshPhongMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 0.8, flatShading: true })
    const lineX = new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, 0.1, 0.05), lineMat)
    lineX.position.set(0, h * 0.9, d / 2)
    group.add(lineX)

    addRooftop(group, w, d, h)
    group.position.set(x, 0, z)
    scene.add(group)
    return group
}

// === 他のビルタイプは今後追加 ===
// makeTallTower のみ先行実装
