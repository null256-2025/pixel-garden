import * as THREE from "three"

// =========================================
//  線路（楕円ループ）
// =========================================

/** 線路の閉曲線 — 呼び出し側で共有して列車の走行に使う */
export let trackCurve: THREE.CatmullRomCurve3

/**
 * 楕円ループ線路を作成してシーンに追加する
 * レール2本 + 枕木を曲線に沿って生成
 * @returns trackCurve — 列車走行用のスプライン曲線
 */
export function createTrack(scene: THREE.Scene): THREE.CatmullRomCurve3 {

    // --- 楕円ループの制御点（角丸の長方形） ---
    const rx = 3.5  // X方向の半径
    const rz = 2.2  // Z方向の半径
    const pointCount = 12

    const points: THREE.Vector3[] = []
    for (let i = 0; i < pointCount; i++) {
        const angle = (i / pointCount) * Math.PI * 2
        points.push(new THREE.Vector3(
            Math.cos(angle) * rx,
            0,
            Math.sin(angle) * rz
        ))
    }

    trackCurve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.5)

    // --- マテリアル ---
    const railMat = new THREE.MeshPhongMaterial({
        color: 0xaaaabc, // 明るいシルバー
        flatShading: true,
    })
    const tieMat = new THREE.MeshPhongMaterial({
        color: 0x5a4030, // 枕木（見える木色）
        flatShading: true,
    })
    const ballastMat = new THREE.MeshPhongMaterial({
        color: 0x555555, // バラスト（砂利）明るめ
        flatShading: true,
    })

    // --- 曲線に沿ってレールと枕木を配置 ---
    const segments = 120     // サンプル点数
    const railGauge = 0.14   // 左右レール間隔（半分）
    const railHeight = 0.025
    const railWidth = 0.02
    const tieSpacing = 4     // 何セグメントごとに枕木を置くか

    for (let i = 0; i < segments; i++) {
        const t0 = i / segments
        const t1 = (i + 1) / segments

        const p0 = trackCurve.getPointAt(t0)
        const p1 = trackCurve.getPointAt(t1)
        const tangent = trackCurve.getTangentAt(t0)

        // 進行方向に対して直交する方向（Y軸まわり90度回転）
        const right = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize()

        const segLen = p0.distanceTo(p1)
        const midPoint = p0.clone().add(p1).multiplyScalar(0.5)
        const angle = Math.atan2(tangent.x, tangent.z)

        // --- 左レール ---
        const leftPos = midPoint.clone().add(right.clone().multiplyScalar(railGauge))
        const leftRail = new THREE.Mesh(
            new THREE.BoxGeometry(railWidth, railHeight, segLen * 1.05),
            railMat
        )
        leftRail.position.copy(leftPos)
        leftRail.position.y = railHeight / 2
        leftRail.rotation.y = angle
        leftRail.receiveShadow = true
        scene.add(leftRail)

        // --- 右レール ---
        const rightPos = midPoint.clone().add(right.clone().multiplyScalar(-railGauge))
        const rightRail = new THREE.Mesh(
            new THREE.BoxGeometry(railWidth, railHeight, segLen * 1.05),
            railMat
        )
        rightRail.position.copy(rightPos)
        rightRail.position.y = railHeight / 2
        rightRail.rotation.y = angle
        rightRail.receiveShadow = true
        scene.add(rightRail)

        // --- 枕木（数セグメントごと） ---
        if (i % tieSpacing === 0) {
            const tieW = railGauge * 2 + 0.1
            const tieH = 0.02
            const tieD = 0.06
            const tie = new THREE.Mesh(
                new THREE.BoxGeometry(tieW, tieH, tieD),
                tieMat
            )
            tie.position.copy(midPoint)
            tie.position.y = tieH / 2
            tie.rotation.y = angle
            tie.receiveShadow = true
            scene.add(tie)

            // バラスト（枕木の下の砂利盛り）
            const ballast = new THREE.Mesh(
                new THREE.BoxGeometry(tieW + 0.06, tieH * 0.5, tieD + 0.04),
                ballastMat
            )
            ballast.position.copy(midPoint)
            ballast.position.y = tieH * 0.25
            ballast.rotation.y = angle
            ballast.receiveShadow = true
            scene.add(ballast)
        }
    }

    return trackCurve
}
