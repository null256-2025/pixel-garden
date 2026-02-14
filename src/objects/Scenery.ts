import * as THREE from "three"

// =========================================
//  風景小物（街灯・信号機・踏切・木）
// =========================================

/**
 * 夜のジオラマ風景要素を作成してシーンに追加する
 * @returns update 関数（信号機の点滅などのアニメーション用）
 */
export function createScenery(scene: THREE.Scene): {
    update: (time: number) => void
} {

    // --- 共通マテリアル ---
    const poleMat = new THREE.MeshPhongMaterial({
        color: 0x444444, flatShading: true
    })
    const darkWoodMat = new THREE.MeshPhongMaterial({
        color: 0x1a1a10, flatShading: true
    })

    // =========================================
    //  街灯
    // =========================================
    function makeStreetLight(x: number, z: number, rotY: number = 0) {
        const group = new THREE.Group()

        // ポール
        const pole = new THREE.Mesh(
            new THREE.BoxGeometry(0.03, 0.5, 0.03),
            poleMat
        )
        pole.position.y = 0.25
        pole.castShadow = true
        group.add(pole)

        // アーム（水平に伸びる部分）
        const arm = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.02, 0.02),
            poleMat
        )
        arm.position.set(0.075, 0.5, 0)
        group.add(arm)

        // ランプヘッド
        const lampMat = new THREE.MeshPhongMaterial({
            color: 0xffddaa,
            emissive: 0xffaa44,
            emissiveIntensity: 0.9,
            flatShading: true,
        })
        const lampHead = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.03, 0.04),
            lampMat
        )
        lampHead.position.set(0.15, 0.49, 0)
        group.add(lampHead)

        // 光源
        const light = new THREE.PointLight(0xffaa44, 1.5, 4.0, 1.2)
        light.position.set(0.15, 0.46, 0)
        group.add(light)

        group.position.set(x, 0, z)
        group.rotation.y = rotY
        scene.add(group)
    }

    // 街灯を線路の外周に配置
    makeStreetLight(-3.8, -2.5, 0)
    makeStreetLight(-3.8, 2.0, 0)
    makeStreetLight(0, -3.0, Math.PI / 4)
    makeStreetLight(0, 3.0, -Math.PI / 4)

    // =========================================
    //  信号機
    // =========================================
    const signalLights: { red: THREE.Mesh; green: THREE.Mesh }[] = []

    function makeSignal(x: number, z: number, rotY: number = 0) {
        const group = new THREE.Group()

        // ポール
        const signalPole = new THREE.Mesh(
            new THREE.BoxGeometry(0.025, 0.45, 0.025),
            poleMat
        )
        signalPole.position.y = 0.225
        signalPole.castShadow = true
        group.add(signalPole)

        // 信号ボックス
        const boxMat = new THREE.MeshPhongMaterial({
            color: 0x2a2a2a, flatShading: true
        })
        const box = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.12, 0.04),
            boxMat
        )
        box.position.y = 0.5
        group.add(box)

        // 赤ランプ
        const redMat = new THREE.MeshPhongMaterial({
            color: 0xff2222,
            emissive: 0xff0000,
            emissiveIntensity: 0.8,
            flatShading: true,
        })
        const red = new THREE.Mesh(
            new THREE.SphereGeometry(0.018, 5, 4),
            redMat
        )
        red.position.set(0, 0.53, 0.021)
        group.add(red)

        // 青ランプ
        const greenMat = new THREE.MeshPhongMaterial({
            color: 0x22ff44,
            emissive: 0x00ff22,
            emissiveIntensity: 0.0,
            flatShading: true,
        })
        const green = new THREE.Mesh(
            new THREE.SphereGeometry(0.018, 5, 4),
            greenMat
        )
        green.position.set(0, 0.47, 0.021)
        group.add(green)

        signalLights.push({ red, green })

        group.position.set(x, 0, z)
        group.rotation.y = rotY
        scene.add(group)
    }

    // 信号機を2箇所に配置
    makeSignal(2.0, -2.5, Math.PI)
    makeSignal(-2.0, 2.5, 0)

    // =========================================
    //  踏切
    // =========================================
    const crossingBars: THREE.Mesh[] = []

    function makeCrossing(x: number, z: number, rotY: number = 0) {
        const group = new THREE.Group()

        // ポール（左右）
        for (const side of [-1, 1]) {
            const cp = new THREE.Mesh(
                new THREE.BoxGeometry(0.03, 0.4, 0.03),
                poleMat
            )
            cp.position.set(side * 0.25, 0.2, 0)
            cp.castShadow = true
            group.add(cp)

            // 遮断棒
            const barMat = new THREE.MeshPhongMaterial({
                color: 0xffcc00, flatShading: true
            })
            const bar = new THREE.Mesh(
                new THREE.BoxGeometry(0.35, 0.02, 0.02),
                barMat
            )
            bar.position.set(side * 0.42, 0.38, 0)
            bar.castShadow = true
            group.add(bar)
            crossingBars.push(bar)

            // 赤白ストライプ部（ポール上部）
            const stripeMat = new THREE.MeshPhongMaterial({
                color: 0xff3333,
                emissive: 0xff0000,
                emissiveIntensity: 0.3,
                flatShading: true
            })
            const stripe = new THREE.Mesh(
                new THREE.BoxGeometry(0.035, 0.06, 0.035),
                stripeMat
            )
            stripe.position.set(side * 0.25, 0.42, 0)
            group.add(stripe)
        }

        // 道路面
        const roadMat = new THREE.MeshPhongMaterial({
            color: 0x3a3a3a, flatShading: true
        })
        const road = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.01, 0.3),
            roadMat
        )
        road.position.y = 0.005
        road.receiveShadow = true
        group.add(road)

        group.position.set(x, 0, z)
        group.rotation.y = rotY
        scene.add(group)
    }

    makeCrossing(-3.5, 0, Math.PI / 2)

    // =========================================
    //  木（夜のシルエット）
    // =========================================
    const treeTrunkMat = new THREE.MeshPhongMaterial({
        color: 0x3a2818, flatShading: true
    })
    const treeLeafMats = [
        new THREE.MeshPhongMaterial({ color: 0x1a4a1a, flatShading: true }),
        new THREE.MeshPhongMaterial({ color: 0x1a5a20, flatShading: true }),
        new THREE.MeshPhongMaterial({ color: 0x184218, flatShading: true }),
    ]

    function makeTree(x: number, z: number, scale: number = 1) {
        const treeGroup = new THREE.Group()

        // 幹
        const trunkH = 0.35 * scale
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03 * scale, 0.045 * scale, trunkH, 5),
            treeTrunkMat
        )
        trunk.position.y = trunkH / 2
        trunk.castShadow = true
        treeGroup.add(trunk)

        // 葉（暗いシルエット）
        const leafMat = treeLeafMats[Math.floor(Math.random() * treeLeafMats.length)]
        const leafR = 0.2 * scale
        const leaf = new THREE.Mesh(
            new THREE.IcosahedronGeometry(leafR, 0),
            leafMat
        )
        leaf.position.y = trunkH + leafR * 0.6
        leaf.rotation.y = Math.random() * Math.PI
        leaf.castShadow = true
        treeGroup.add(leaf)

        // サブ葉
        if (scale > 0.7) {
            const sub = new THREE.Mesh(
                new THREE.IcosahedronGeometry(leafR * 0.6, 0),
                treeLeafMats[Math.floor(Math.random() * treeLeafMats.length)]
            )
            sub.position.set(leafR * 0.4, trunkH + leafR * 0.3, leafR * 0.3)
            sub.castShadow = true
            treeGroup.add(sub)
        }

        treeGroup.position.set(x, 0, z)
        scene.add(treeGroup)
    }

    // 木を散らばせる（線路の外側）
    makeTree(-4.5, -3.0, 1.2)
    makeTree(-4.8, 0.5, 0.9)
    makeTree(-4.2, 2.5, 1.1)
    makeTree(4.5, -2.5, 1.0)
    makeTree(4.8, 1.5, 0.8)
    makeTree(2.0, 3.5, 1.3)
    makeTree(-2.0, -3.5, 0.7)
    makeTree(0, 3.8, 1.0)
    makeTree(-1.5, 3.5, 0.6)

    // =========================================
    //  アニメーション更新
    // =========================================
    function update(time: number) {
        // 信号機の切替え（3秒周期で赤⇔青）
        const signalState = Math.floor(time / 3) % 2 === 0
        signalLights.forEach(({ red, green }) => {
            const redMat = red.material as THREE.MeshPhongMaterial
            const greenMat = green.material as THREE.MeshPhongMaterial
            redMat.emissiveIntensity = signalState ? 0.8 : 0.05
            greenMat.emissiveIntensity = signalState ? 0.05 : 0.8
        })

        // 踏切遮断棒の微揺れ（風で少し揺れる感じ）
        crossingBars.forEach((bar, i) => {
            bar.rotation.z = Math.sin(time * 2 + i) * 0.02
        })
    }

    return { update }
}
