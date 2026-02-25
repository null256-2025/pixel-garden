import * as THREE from "three"

/**
 * ハーフティンバー風の家を作成してシーンに追加する
 * 基礎・壁・屋根・木の梁・ドア・窓・ポーチ・煙突・小道を含む
 */
export function createHouse(scene: THREE.Scene) {

    const houseX = 0
    const houseZ = -0.5

    const houseGroup = new THREE.Group()

    // --- マテリアル定義 ---
    const wallMat = new THREE.MeshPhongMaterial({
        color: 0xf0e0c8, flatShading: true // クリーム色の漆喰壁
    })
    const woodMat = new THREE.MeshPhongMaterial({
        color: 0x5c3a1e, flatShading: true // 濃茶: 木の梁・柱
    })
    const roofMat = new THREE.MeshPhongMaterial({
        color: 0xb54a3a, flatShading: true // 赤茶色の屋根
    })
    const roofDarkMat = new THREE.MeshPhongMaterial({
        color: 0x8c3528, flatShading: true // 屋根の暗い部分
    })
    const doorMat = new THREE.MeshPhongMaterial({
        color: 0x7a4a2a, flatShading: true // ドア
    })
    const windowMat = new THREE.MeshPhongMaterial({
        color: 0xaad4ee, emissive: 0x2a5a7a, emissiveIntensity: 0.15, flatShading: true
    })
    const stoneMat = new THREE.MeshPhongMaterial({
        color: 0x9a9080, flatShading: true // 基礎の石色
    })
    const chimneyMat = new THREE.MeshPhongMaterial({
        color: 0x7a6a5a, flatShading: true
    })

    // ========== 寸法定義 ==========
    const wallW = 1.8
    const wallH = 0.9
    const wallD = 1.3
    const foundH = 0.12
    const roofH = 0.8
    const roofOverhang = 0.2
    const bt = 0.06 // beam thickness

    // ========== 基礎（石垣） ==========
    const foundGeo = new THREE.BoxGeometry(wallW + 0.1, foundH, wallD + 0.1)
    const foundation = new THREE.Mesh(foundGeo, stoneMat)
    foundation.position.y = foundH / 2
    foundation.castShadow = true
    foundation.receiveShadow = true
    houseGroup.add(foundation)

    // ========== 1階 壁 ==========
    const wallGeo = new THREE.BoxGeometry(wallW, wallH, wallD)
    const mainWall = new THREE.Mesh(wallGeo, wallMat)
    mainWall.position.y = foundH + wallH / 2
    mainWall.castShadow = true
    mainWall.receiveShadow = true
    houseGroup.add(mainWall)

    // ========== 切妻屋根（ExtrudeGeometry） ==========
    const roofShape = new THREE.Shape()
    const halfW = wallW / 2 + roofOverhang
    roofShape.moveTo(-halfW, 0)
    roofShape.lineTo(0, roofH)
    roofShape.lineTo(halfW, 0)
    roofShape.lineTo(-halfW, 0)

    const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
        depth: wallD + roofOverhang * 2,
        bevelEnabled: false
    })
    const roof = new THREE.Mesh(roofGeo, roofMat)
    roof.position.set(0, foundH + wallH, -wallD / 2 - roofOverhang)
    roof.castShadow = true
    roof.receiveShadow = true
    houseGroup.add(roof)

    // 棟木（てっぺんの横木）
    const ridgeGeo = new THREE.BoxGeometry(bt * 1.5, bt, wallD + roofOverhang * 2 + 0.05)
    const ridge = new THREE.Mesh(ridgeGeo, woodMat)
    ridge.position.set(0, foundH + wallH + roofH, 0)
    ridge.castShadow = true
    houseGroup.add(ridge)

    // ========== ハーフティンバー（木の梁） ==========
    function addBeam(w: number, h: number, d: number, x: number, y: number, z: number) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), woodMat)
        beam.position.set(x, y, z)
        beam.castShadow = true
        houseGroup.add(beam)
    }

    const bY = foundH

    // 正面 (Z+)
    const fZ = wallD / 2 + 0.03
    addBeam(wallW + 0.04, bt, bt, 0, bY + bt / 2, fZ)                // 下横梁
    addBeam(wallW + 0.04, bt, bt, 0, bY + wallH - bt / 2, fZ)        // 上横梁
    addBeam(wallW + 0.04, bt, bt, 0, bY + wallH * 0.5, fZ)           // 中段横梁
    addBeam(bt, wallH, bt, -wallW / 2, bY + wallH / 2, fZ)           // 左柱
    addBeam(bt, wallH, bt, wallW / 2, bY + wallH / 2, fZ)            // 右柱
    addBeam(bt, wallH * 0.5, bt, -0.22, bY + wallH * 0.25, fZ)       // ドア左柱
    addBeam(bt, wallH * 0.5, bt, 0.22, bY + wallH * 0.25, fZ)        // ドア右柱

    // 背面 (Z-)
    const bZ = -wallD / 2 - 0.03
    addBeam(wallW + 0.04, bt, bt, 0, bY + bt / 2, bZ)
    addBeam(wallW + 0.04, bt, bt, 0, bY + wallH - bt / 2, bZ)
    addBeam(bt, wallH, bt, -wallW / 2, bY + wallH / 2, bZ)
    addBeam(bt, wallH, bt, wallW / 2, bY + wallH / 2, bZ)
    addBeam(bt, wallH, bt, 0, bY + wallH / 2, bZ)                    // 中央柱

    // 側面 (X+, X-)
    for (const side of [-1, 1]) {
        const sX = side * (wallW / 2 + 0.03)
        addBeam(bt, wallH, bt, sX, bY + wallH / 2, -wallD / 4)
        addBeam(bt, wallH, bt, sX, bY + wallH / 2, wallD / 4)
        addBeam(bt, bt, wallD + 0.04, sX, bY + bt / 2, 0)
        addBeam(bt, bt, wallD + 0.04, sX, bY + wallH - bt / 2, 0)
        addBeam(bt, bt, wallD + 0.04, sX, bY + wallH * 0.5, 0)       // 中段横梁
    }

    // ========== ドア ==========
    const doorW = 0.3
    const doorH = 0.42
    const door = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.06), doorMat)
    door.position.set(0, foundH + doorH / 2, wallD / 2 + 0.04)
    door.castShadow = true
    houseGroup.add(door)

    // ドアノブ
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 4), stoneMat)
    knob.position.set(0.08, foundH + doorH * 0.45, wallD / 2 + 0.08)
    houseGroup.add(knob)

    // ========== 窓 ==========
    function addWindow(wx: number, wy: number, wz: number, faceAxis: 'z' | 'x') {
        const wS = 0.2
        const wD = 0.06
        const ft = 0.025 // frame thickness

        // ガラス
        const glassGeo = faceAxis === 'z'
            ? new THREE.BoxGeometry(wS, wS, wD)
            : new THREE.BoxGeometry(wD, wS, wS)
        const glass = new THREE.Mesh(glassGeo, windowMat)
        glass.position.set(wx, wy, wz)
        houseGroup.add(glass)

        // 窓枠（十字に木を入れる）
        const outward = faceAxis === 'z' ? (wz > 0 ? 0.015 : -0.015) : (wx > 0 ? 0.015 : -0.015)
        if (faceAxis === 'z') {
            addBeam(ft, wS + ft * 2, ft, wx, wy, wz + outward)       // 縦
            addBeam(wS + ft * 2, ft, ft, wx, wy, wz + outward)       // 横
        } else {
            addBeam(ft, wS + ft * 2, ft, wx + outward, wy, wz)
            addBeam(ft, ft, wS + ft * 2, wx + outward, wy, wz)
        }
    }

    const winY = foundH + wallH * 0.6
    // 正面（ドアの左右）
    addWindow(-0.55, winY, wallD / 2 + 0.04, 'z')
    addWindow(0.55, winY, wallD / 2 + 0.04, 'z')
    // 側面
    addWindow(-wallW / 2 - 0.04, winY, 0, 'x')
    addWindow(wallW / 2 + 0.04, winY, 0, 'x')
    // 背面
    addWindow(-0.35, winY, -wallD / 2 - 0.04, 'z')
    addWindow(0.35, winY, -wallD / 2 - 0.04, 'z')

    // ========== ポーチ（玄関の庇） ==========
    const porchW = 0.7
    const porchD = 0.35

    // 庇の屋根
    const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(porchW, 0.04, porchD), roofDarkMat)
    porchRoof.position.set(0, foundH + doorH + 0.08, wallD / 2 + porchD / 2)
    porchRoof.castShadow = true
    houseGroup.add(porchRoof)

    // 庇を支える柱
    const pillarGeo = new THREE.BoxGeometry(0.05, doorH + 0.08, 0.05)
    for (const px of [-porchW / 2 + 0.03, porchW / 2 - 0.03]) {
        const pillar = new THREE.Mesh(pillarGeo, woodMat)
        pillar.position.set(px, foundH + (doorH + 0.08) / 2, wallD / 2 + porchD - 0.03)
        pillar.castShadow = true
        houseGroup.add(pillar)
    }

    // ポーチの床
    const porchFloor = new THREE.Mesh(new THREE.BoxGeometry(porchW, 0.04, porchD), stoneMat)
    porchFloor.position.set(0, foundH / 2, wallD / 2 + porchD / 2)
    porchFloor.receiveShadow = true
    houseGroup.add(porchFloor)

    // ========== 煙突 ==========
    const chW = 0.18
    const chH = 0.55
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(chW, chH, chW), chimneyMat)
    chimney.position.set(wallW * 0.28, foundH + wallH + roofH * 0.55, -wallD * 0.2)
    chimney.castShadow = true
    houseGroup.add(chimney)

    // 煙突キャップ
    const chimneyTop = new THREE.Mesh(new THREE.BoxGeometry(chW + 0.06, 0.04, chW + 0.06), chimneyMat)
    chimneyTop.position.set(wallW * 0.28, foundH + wallH + roofH * 0.55 + chH / 2 + 0.02, -wallD * 0.2)
    houseGroup.add(chimneyTop)

    // ========== 家全体を配置 ==========
    houseGroup.position.set(houseX, 0, houseZ)
    scene.add(houseGroup)
}
