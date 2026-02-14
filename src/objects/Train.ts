import * as THREE from "three"

// =========================================
//  列車（機関車 + 客車）
// =========================================

export interface TrainSet {
    /** 列車全体のグループ（機関車 + 客車） */
    locomotive: THREE.Group
    cars: THREE.Group[]
    /** SpotLight ヘッドライト */
    headlight: THREE.SpotLight
    /** 毎フレーム呼ぶ更新関数 */
    update: (time: number) => void
}

/**
 * ボクセル風の列車セットを作成してシーンに追加する
 * @param scene   追加先シーン
 * @param curve   走行する線路の曲線
 * @param speed   周回速度（1周/秒 = 1.0）
 * @param carCount 客車の数
 */
export function createTrain(
    scene: THREE.Scene,
    curve: THREE.CatmullRomCurve3,
    speed: number = 0.03,
    carCount: number = 2
): TrainSet {

    // --- マテリアル ---
    const bodyMat = new THREE.MeshPhongMaterial({
        color: 0xc0392b, flatShading: true  // 赤い機関車
    })
    const darkMat = new THREE.MeshPhongMaterial({
        color: 0x2c2c2c, flatShading: true  // 暗部・車輪
    })
    const roofMat = new THREE.MeshPhongMaterial({
        color: 0x1a1a2e, flatShading: true  // 屋根（濃紺）
    })
    const chimneyMat = new THREE.MeshPhongMaterial({
        color: 0x333333, flatShading: true  // 煙突
    })
    const windowMat = new THREE.MeshPhongMaterial({
        color: 0xffdd88,
        emissive: 0xffaa44,
        emissiveIntensity: 0.6,
        flatShading: true  // 窓（暖色の光）
    })
    const carBodyMat = new THREE.MeshPhongMaterial({
        color: 0x2e6b3e, flatShading: true  // 客車（深緑）
    })
    const carWindowMat = new THREE.MeshPhongMaterial({
        color: 0xffdd88,
        emissive: 0xffaa44,
        emissiveIntensity: 0.4,
        flatShading: true
    })
    const frontMat = new THREE.MeshPhongMaterial({
        color: 0xffee88,
        emissive: 0xffcc44,
        emissiveIntensity: 0.5,
        flatShading: true  // 前灯面
    })

    // --- 機関車を組み立てる ---
    function buildLocomotive(): THREE.Group {
        const loco = new THREE.Group()

        // ボディ（メイン）
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.22, 0.16, 0.4),
            bodyMat
        )
        body.position.y = 0.12
        body.castShadow = true
        loco.add(body)

        // 屋根
        const roof = new THREE.Mesh(
            new THREE.BoxGeometry(0.24, 0.03, 0.28),
            roofMat
        )
        roof.position.set(0, 0.215, -0.04)
        roof.castShadow = true
        loco.add(roof)

        // 煙突
        const chimney = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.1, 0.06),
            chimneyMat
        )
        chimney.position.set(0, 0.25, 0.12)
        chimney.castShadow = true
        loco.add(chimney)

        // 煙突トップ
        const chimneyTop = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.02, 0.08),
            chimneyMat
        )
        chimneyTop.position.set(0, 0.31, 0.12)
        loco.add(chimneyTop)

        // 窓（運転席）- 左右
        for (const side of [-1, 1]) {
            const win = new THREE.Mesh(
                new THREE.BoxGeometry(0.02, 0.06, 0.08),
                windowMat
            )
            win.position.set(side * 0.12, 0.15, -0.08)
            loco.add(win)
        }

        // 前灯面
        const front = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.06, 0.02),
            frontMat
        )
        front.position.set(0, 0.1, 0.21)
        loco.add(front)

        // 台車部分（下部の黒い枠）
        const chassis = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.04, 0.42),
            darkMat
        )
        chassis.position.y = 0.03
        chassis.castShadow = true
        loco.add(chassis)

        // 車輪（左右各2個）
        for (const side of [-1, 1]) {
            for (const zOff of [-0.12, 0.12]) {
                const wheel = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.035, 0.035, 0.03, 6),
                    darkMat
                )
                wheel.rotation.z = Math.PI / 2
                wheel.position.set(side * 0.12, 0.035, zOff)
                loco.add(wheel)
            }
        }

        return loco
    }

    // --- 客車を組み立てる ---
    function buildCar(): THREE.Group {
        const car = new THREE.Group()

        // ボディ
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.14, 0.35),
            carBodyMat
        )
        body.position.y = 0.11
        body.castShadow = true
        car.add(body)

        // 屋根
        const roof = new THREE.Mesh(
            new THREE.BoxGeometry(0.22, 0.025, 0.36),
            roofMat
        )
        roof.position.y = 0.2
        roof.castShadow = true
        car.add(roof)

        // 窓（両側に3つずつ）
        for (const side of [-1, 1]) {
            for (let i = 0; i < 3; i++) {
                const win = new THREE.Mesh(
                    new THREE.BoxGeometry(0.02, 0.05, 0.06),
                    carWindowMat
                )
                win.position.set(side * 0.11, 0.13, (i - 1) * 0.1)
                car.add(win)
            }
        }

        // 台車
        const chassis = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.03, 0.36),
            darkMat
        )
        chassis.position.y = 0.025
        chassis.castShadow = true
        car.add(chassis)

        // 車輪
        for (const side of [-1, 1]) {
            for (const zOff of [-0.12, 0.12]) {
                const wheel = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.03, 0.03, 0.025, 6),
                    darkMat
                )
                wheel.rotation.z = Math.PI / 2
                wheel.position.set(side * 0.1, 0.03, zOff)
                car.add(wheel)
            }
        }

        return car
    }

    // --- 列車セットを組み立てる ---
    const locomotive = buildLocomotive()
    scene.add(locomotive)

    const cars: THREE.Group[] = []
    for (let i = 0; i < carCount; i++) {
        const car = buildCar()
        scene.add(car)
        cars.push(car)
    }

    // --- ヘッドライト（SpotLight） ---
    const headlight = new THREE.SpotLight(0xffee88, 3, 6, Math.PI / 5, 0.3, 1)
    headlight.castShadow = true
    headlight.shadow.mapSize.set(512, 512)
    locomotive.add(headlight)
    headlight.position.set(0, 0.12, 0.22)

    // SpotLight の target を列車の前方に配置
    const headlightTarget = new THREE.Object3D()
    headlightTarget.position.set(0, -0.05, 1.5)
    locomotive.add(headlightTarget)
    headlight.target = headlightTarget

    // --- 走行間隔（各車両間のt差） ---
    const carSpacing = 0.04 // 曲線上の間隔

    // --- 更新関数 ---
    function update(time: number) {
        const t = (time * speed) % 1

        // 機関車
        positionOnTrack(locomotive, t)

        // 客車（機関車の後方に等間隔）
        cars.forEach((car, i) => {
            const carT = ((t - carSpacing * (i + 1)) % 1 + 1) % 1
            positionOnTrack(car, carT)
        })
    }

    function positionOnTrack(obj: THREE.Group, t: number) {
        const pos = curve.getPointAt(t)
        const tangent = curve.getTangentAt(t)

        obj.position.copy(pos)
        // 進行方向を向く
        const lookTarget = pos.clone().add(tangent)
        obj.lookAt(lookTarget)
    }

    return { locomotive, cars, headlight, update }
}
