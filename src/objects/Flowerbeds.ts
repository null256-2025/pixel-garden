import * as THREE from "three"

/**
 * 花壇を複数作成してシーンに追加する
 * 土のベッド・木枠の縁・花（茎+花+葉）で構成
 */
export function createFlowerbeds(scene: THREE.Scene) {

    // --- マテリアル ---
    const soilMat = new THREE.MeshPhongMaterial({
        color: 0x6b4423, flatShading: true // 茶色の土
    })
    const soilEdgeMat = new THREE.MeshPhongMaterial({
        color: 0x8B6914, flatShading: true // 花壇の縁（木色）
    })

    // 花の色バリエーション
    const flowerColors = [
        0xff6b8a, // ピンク
        0xffd93d, // 黄色
        0xff8c42, // オレンジ
        0xc084fc, // 紫
        0xf87171, // 赤
        0xffffff, // 白
    ]
    const flowerMats = flowerColors.map(c =>
        new THREE.MeshPhongMaterial({ color: c, flatShading: true })
    )
    const stemMat = new THREE.MeshPhongMaterial({
        color: 0x3d7a28, flatShading: true // 茎の緑
    })
    const leafMat = new THREE.MeshPhongMaterial({
        color: 0x4a9030, flatShading: true // 葉っぱの緑
    })

    // --- 花壇を1つ作る関数 ---
    function makeFlowerbed(
        x: number, z: number,
        bedW: number, bedD: number,
        flowerCount: number,
        rotY: number = 0
    ) {
        const bedGroup = new THREE.Group()

        // 土のベッド
        const bedH = 0.06
        const bed = new THREE.Mesh(
            new THREE.BoxGeometry(bedW, bedH, bedD),
            soilMat
        )
        bed.position.y = bedH / 2
        bed.receiveShadow = true
        bedGroup.add(bed)

        // 花壇の縁（木枠）
        const edgeT = 0.04
        const edgeH = bedH + 0.02
        // 前後
        for (const dz of [-bedD / 2, bedD / 2]) {
            const edge = new THREE.Mesh(
                new THREE.BoxGeometry(bedW + edgeT * 2, edgeH, edgeT),
                soilEdgeMat
            )
            edge.position.set(0, edgeH / 2, dz)
            edge.castShadow = true
            bedGroup.add(edge)
        }
        // 左右
        for (const dx of [-bedW / 2, bedW / 2]) {
            const edge = new THREE.Mesh(
                new THREE.BoxGeometry(edgeT, edgeH, bedD),
                soilEdgeMat
            )
            edge.position.set(dx, edgeH / 2, 0)
            edge.castShadow = true
            bedGroup.add(edge)
        }

        // 花を植える
        for (let i = 0; i < flowerCount; i++) {
            const fx = (Math.random() - 0.5) * (bedW - 0.1)
            const fz = (Math.random() - 0.5) * (bedD - 0.1)

            // 茎
            const stemH = 0.08 + Math.random() * 0.1
            const stem = new THREE.Mesh(
                new THREE.BoxGeometry(0.02, stemH, 0.02),
                stemMat
            )
            stem.position.set(fx, bedH + stemH / 2, fz)
            stem.castShadow = true
            bedGroup.add(stem)

            // 花（球or多面体）
            const mat = flowerMats[Math.floor(Math.random() * flowerMats.length)]
            const flowerSize = 0.04 + Math.random() * 0.03
            const flowerGeo = Math.random() > 0.5
                ? new THREE.SphereGeometry(flowerSize, 5, 4)
                : new THREE.IcosahedronGeometry(flowerSize, 0)
            const flower = new THREE.Mesh(flowerGeo, mat)
            flower.position.set(fx, bedH + stemH + flowerSize * 0.5, fz)
            flower.rotation.set(
                Math.random() * 0.3,
                Math.random() * Math.PI,
                Math.random() * 0.3
            )
            flower.castShadow = true
            bedGroup.add(flower)

            // 葉っぱ（たまに追加）
            if (Math.random() > 0.4) {
                const leafGeo = new THREE.BoxGeometry(0.06, 0.015, 0.025)
                const leaf = new THREE.Mesh(leafGeo, leafMat)
                leaf.position.set(fx + 0.03, bedH + stemH * 0.4, fz)
                leaf.rotation.z = -0.4
                bedGroup.add(leaf)
            }
        }

        bedGroup.position.set(x, 0, z)
        bedGroup.rotation.y = rotY
        scene.add(bedGroup)
    }

    // --- 花壇の配置 ---

    // 家の左側（長い花壇）
    makeFlowerbed(-1.4, -0.5, 0.5, 1.2, 8)

    // 家の右側（長い花壇）
    makeFlowerbed(1.4, -0.5, 0.5, 1.2, 8)

    // 小道の左側（小さな花壇）
    makeFlowerbed(-0.8, 1.2, 0.6, 0.5, 5)

    // 小道の右側（小さな花壇）
    makeFlowerbed(0.8, 1.2, 0.6, 0.5, 5)

    // 家の裏（奥側）
    makeFlowerbed(0, -1.8, 1.4, 0.4, 10)
}
