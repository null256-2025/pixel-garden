import * as THREE from "three"
import { NeonManager } from "../managers/NeonManager"

// --- 街路灯を1本作る関数 ---
export function makeStreetLight(scene: THREE.Scene, x: number, z: number, size: 'small' | 'medium' | 'large', rotY: number = 0, neonManager?: NeonManager) {
    const lightGroup = new THREE.Group()

    // ポールのマテリアル
    const poleMat = new THREE.MeshPhongMaterial({
        color: 0x444455,
        flatShading: true
    })

    // サイズ別パラメータ
    const params = {
        small: { poleH: 0.8, poleR: 0.03, headR: 0.08, lightY: 0.85, lightIntensity: 1.5, lightDist: 3.0 },
        medium: { poleH: 1.2, poleR: 0.04, headR: 0.10, lightY: 1.25, lightIntensity: 2.0, lightDist: 4.0 },
        large: { poleH: 1.6, poleR: 0.05, headR: 0.12, lightY: 1.65, lightIntensity: 2.5, lightDist: 5.0 },
    }
    const p = params[size]

    // ポール（円柱）
    const poleGeo = new THREE.CylinderGeometry(p.poleR, p.poleR * 1.5, p.poleH, 6)
    const pole = new THREE.Mesh(poleGeo, poleMat)
    pole.position.y = p.poleH / 2
    pole.castShadow = true
    pole.receiveShadow = true
    lightGroup.add(pole)

    // ランプのアームは無し（真っ直ぐ上に付くタイプ）
    // ランプヘッドの下部（ポールから広がる黒い部分）
    const lampBaseGeo = new THREE.CylinderGeometry(p.headR, p.poleR, 0.15, 12)
    const lampBase = new THREE.Mesh(lampBaseGeo, poleMat)
    lampBase.position.y = p.poleH + 0.075
    lightGroup.add(lampBase)

    // ランプヘッド（光る白い部分、すり鉢状）
    const lampColor = 0xffaa00 // 温かみのある暖色系の光（オレンジ/黄）
    const lampMat = new THREE.MeshPhongMaterial({
        color: lampColor,
        emissive: lampColor,
        emissiveIntensity: 0.8, // 発光を少し抑えめに
        flatShading: true,
        transparent: true,
        opacity: 0.9,
    })

    let lampIntensity = 0.8;
    let flickerType: 'steady' | 'buggy' | 'broken' = 'steady';

    // 一部の街灯を壊れかけにする
    const rand = Math.random();
    if (rand < 0.05) {
        flickerType = 'buggy'; // たまにパチパチする
        lampIntensity = 0.6;
    } else if (rand < 0.08) {
        flickerType = 'broken'; // 完全に壊れかけていてたまに光る
    }

    const lampGeo = new THREE.CylinderGeometry(p.headR * 1.5, p.headR, 0.2, 12)
    const lamp = new THREE.Mesh(lampGeo, neonManager ? neonManager.register(lampMat, { type: flickerType as any, baseIntensity: lampIntensity }, true) : lampMat)
    lamp.position.y = p.poleH + 0.15 + 0.1
    lightGroup.add(lamp)

    // ランプ上のカバー（平らな暗い蓋）
    const coverGeo = new THREE.CylinderGeometry(p.headR * 1.6, p.headR * 1.5, 0.05, 12)
    const coverMat = new THREE.MeshPhongMaterial({
        color: 0x222230,
        flatShading: true,
    })
    const cover = new THREE.Mesh(coverGeo, coverMat)
    cover.position.y = p.poleH + 0.15 + 0.2 + 0.025
    lightGroup.add(cover)



    // ポールの根元のディテール（ベースプレート）
    const basePlate = new THREE.Mesh(
        new THREE.CylinderGeometry(p.poleR * 2.5, p.poleR * 3, 0.04, 6),
        poleMat
    )
    basePlate.position.y = 0.02
    lightGroup.add(basePlate)

    lightGroup.userData.type = 'streetlight'
    lightGroup.position.set(x, 0, z)
    lightGroup.rotation.y = rotY

    scene.add(lightGroup)
    return lightGroup
}

/**
 * 初期シーン用に街路灯を複数配置してシーンに追加する
 */
export function createStreetLights(scene: THREE.Scene): THREE.Group[] {
    const lights: THREE.Group[] = []

    // 大きな街路灯（主要通り沿い）
    lights.push(makeStreetLight(scene, -3.5, 2.0, 'large', Math.random() * Math.PI * 2))
    lights.push(makeStreetLight(scene, 3.5, 2.0, 'large', Math.random() * Math.PI * 2))
    lights.push(makeStreetLight(scene, -3.5, -3.0, 'large', Math.random() * Math.PI * 2))
    lights.push(makeStreetLight(scene, 3.5, -3.0, 'large', Math.random() * Math.PI * 2))

    // 中くらいの街路灯
    lights.push(makeStreetLight(scene, 0, 5.0, 'medium', Math.random() * Math.PI * 2))
    lights.push(makeStreetLight(scene, -6.0, 0, 'medium', Math.random() * Math.PI * 2))
    lights.push(makeStreetLight(scene, 6.0, 0, 'medium', Math.random() * Math.PI * 2))
    lights.push(makeStreetLight(scene, 0, -6.0, 'medium', Math.random() * Math.PI * 2))

    // 小さな街路灯（路地裏）
    lights.push(makeStreetLight(scene, -1.5, 6.0, 'small', Math.random() * Math.PI * 2))
    lights.push(makeStreetLight(scene, 5.0, 5.0, 'small', Math.random() * Math.PI * 2))
    lights.push(makeStreetLight(scene, -5.0, -5.0, 'small', Math.random() * Math.PI * 2))

    return lights
}


// 地面のディテール（マンホール/排水溝風）
export function makeGroundDetail(scene: THREE.Scene, x: number, z: number) {
    const detailGroup = new THREE.Group()

    const metalMat = new THREE.MeshPhongMaterial({
        color: 0x333344,
        flatShading: true,
    })

    // マンホール風の丸い蓋
    const coverGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.01, 8)
    const cover = new THREE.Mesh(coverGeo, metalMat)
    cover.position.y = 0.005
    cover.receiveShadow = true
    detailGroup.add(cover)

    // 格子模様（十字線）
    const lineGeo = new THREE.BoxGeometry(0.14, 0.012, 0.015)
    const line1 = new THREE.Mesh(lineGeo, metalMat)
    line1.position.y = 0.01
    detailGroup.add(line1)
    const line2 = new THREE.Mesh(lineGeo, metalMat)
    line2.position.y = 0.01
    line2.rotation.y = Math.PI / 2
    detailGroup.add(line2)

    detailGroup.position.set(x, 0, z)
    scene.add(detailGroup)
    return detailGroup
}

/**
 * 地面のディテールを散布
 */
export function createGroundDetails(scene: THREE.Scene): THREE.Group[] {
    const details: THREE.Group[] = []

    for (let i = 0; i < 15; i++) {
        let gx, gz
        do {
            gx = (Math.random() - 0.5) * 16
            gz = (Math.random() - 0.5) * 16
        } while (Math.abs(gx) < 2.5 && Math.abs(gz) < 2.5) // ビル群の中心を避ける

        details.push(makeGroundDetail(scene, gx, gz))
    }

    return details
}
