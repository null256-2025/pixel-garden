import * as THREE from "three"

// =========================================
//  駅舎 + ホーム
// =========================================

/**
 * 小さな駅舎とホームを作成してシーンに追加する
 * ホーム上に街灯（PointLight）も設置
 */
export function createStation(scene: THREE.Scene) {

    const stationGroup = new THREE.Group()

    // --- マテリアル ---
    const platformMat = new THREE.MeshPhongMaterial({
        color: 0x555560, flatShading: true  // コンクリートグレー
    })
    const wallMat = new THREE.MeshPhongMaterial({
        color: 0x6a5040, flatShading: true  // 茶色い壁
    })
    const roofMat = new THREE.MeshPhongMaterial({
        color: 0x3a2828, flatShading: true  // 暗い赤屋根
    })
    const windowMat = new THREE.MeshPhongMaterial({
        color: 0xffdd88,
        emissive: 0xffaa44,
        emissiveIntensity: 0.5,
        flatShading: true  // 暖色の窓明かり
    })
    const signMat = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.3,
        flatShading: true  // 駅名看板
    })
    const benchMat = new THREE.MeshPhongMaterial({
        color: 0x4a3020, flatShading: true  // ベンチ（木）
    })
    const poleMat = new THREE.MeshPhongMaterial({
        color: 0x444444, flatShading: true  // 街灯ポール
    })

    // ========== ホーム（プラットフォーム） ==========
    const platW = 1.2
    const platH = 0.08
    const platD = 0.5
    const platform = new THREE.Mesh(
        new THREE.BoxGeometry(platW, platH, platD),
        platformMat
    )
    platform.position.y = platH / 2
    platform.receiveShadow = true
    platform.castShadow = true
    stationGroup.add(platform)

    // ホームの黄色い縁（安全線）
    const edgeMat = new THREE.MeshPhongMaterial({
        color: 0xccaa00, flatShading: true
    })
    const edge = new THREE.Mesh(
        new THREE.BoxGeometry(platW, platH + 0.005, 0.04),
        edgeMat
    )
    edge.position.set(0, platH / 2, platD / 2 - 0.02)
    stationGroup.add(edge)

    // ========== 駅舎 ==========
    const bldgW = 0.6
    const bldgH = 0.45
    const bldgD = 0.35

    // 壁
    const building = new THREE.Mesh(
        new THREE.BoxGeometry(bldgW, bldgH, bldgD),
        wallMat
    )
    building.position.set(0, platH + bldgH / 2, -platD / 2 + bldgD / 2 + 0.02)
    building.castShadow = true
    building.receiveShadow = true
    stationGroup.add(building)

    // 屋根
    const roofOverhang = 0.08
    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(bldgW + roofOverhang * 2, 0.03, bldgD + roofOverhang * 2),
        roofMat
    )
    roof.position.set(0, platH + bldgH + 0.015, building.position.z)
    roof.castShadow = true
    stationGroup.add(roof)

    // 窓（正面に2つ）
    for (const wx of [-0.15, 0.15]) {
        const win = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.1, 0.02),
            windowMat
        )
        win.position.set(wx, platH + bldgH * 0.55, building.position.z + bldgD / 2 + 0.01)
        stationGroup.add(win)
    }

    // ドア（正面中央）
    const doorMat = new THREE.MeshPhongMaterial({
        color: 0x3a2a1a, flatShading: true
    })
    const door = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.2, 0.02),
        doorMat
    )
    door.position.set(0, platH + 0.1, building.position.z + bldgD / 2 + 0.01)
    stationGroup.add(door)

    // ========== 駅名看板 ==========
    const sign = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.08, 0.02),
        signMat
    )
    sign.position.set(0, platH + bldgH + 0.06, building.position.z + bldgD / 2 + 0.02)
    stationGroup.add(sign)

    // ========== ベンチ ==========
    for (const bx of [-0.35, 0.35]) {
        const bench = new THREE.Group()

        // 座面
        const seat = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.015, 0.06),
            benchMat
        )
        seat.position.y = 0.06
        bench.add(seat)

        // 脚
        for (const lx of [-0.05, 0.05]) {
            const leg = new THREE.Mesh(
                new THREE.BoxGeometry(0.015, 0.06, 0.015),
                poleMat
            )
            leg.position.set(lx, 0.03, 0)
            bench.add(leg)
        }

        bench.position.set(bx, platH, 0.05)
        stationGroup.add(bench)
    }

    // ========== ホームの街灯 ==========
    for (const lx of [-0.45, 0.45]) {
        const lampGroup = new THREE.Group()

        // ポール
        const pole = new THREE.Mesh(
            new THREE.BoxGeometry(0.025, 0.4, 0.025),
            poleMat
        )
        pole.position.y = 0.2
        pole.castShadow = true
        lampGroup.add(pole)

        // ランプ部分（光る）
        const lampMat = new THREE.MeshPhongMaterial({
            color: 0xffddaa,
            emissive: 0xffaa55,
            emissiveIntensity: 0.8,
            flatShading: true
        })
        const lamp = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 0.04, 0.05),
            lampMat
        )
        lamp.position.y = 0.42
        lampGroup.add(lamp)

        // 光源
        const light = new THREE.PointLight(0xffaa55, 1.5, 4.0, 1.2)
        light.position.y = 0.42
        lampGroup.add(light)

        lampGroup.position.set(lx, platH, 0.1)
        stationGroup.add(lampGroup)
    }

    // ========== 配置 ==========
    // 線路の外側（楕円のX+側のさらに外）に配置
    stationGroup.position.set(4.8, 0, -0.3)
    stationGroup.rotation.y = Math.PI / 2 // 線路に対して横向き
    scene.add(stationGroup)
}
