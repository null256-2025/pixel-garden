// =============================================
//  createCharacter.ts — ボクセル風キャラ
// =============================================
import * as THREE from 'three'

// ---- ボクセルパーツ ----
function box(
    w: number, h: number, d: number, color: number
): THREE.Mesh {
    const geo = new THREE.BoxGeometry(w, h, d)
    const mat = new THREE.MeshLambertMaterial({ color })
    return new THREE.Mesh(geo, mat)
}

// ---- キャラクター状態 ----
type CharState = 'work' | 'rest'

export interface CharacterRef {
    group: THREE.Group
    update: (time: number, delta: number) => void
}

// 巡回ポイント（島内）
const WAYPOINTS: THREE.Vector3[] = [
    new THREE.Vector3(-1.5, 0.22, 0.5),
    new THREE.Vector3(1.0, 0.22, 1.5),
    new THREE.Vector3(2.0, 0.22, -0.5),
    new THREE.Vector3(0.0, 0.22, -1.5),
    new THREE.Vector3(-1.8, 0.22, -1.0),
]

export function createCharacter(scene: THREE.Scene): CharacterRef {
    const group = new THREE.Group()

    // ---- パーツ ----
    const SKIN = 0xffd59a
    const HAIR = 0x4a3020
    const SHIRT = 0x4a8fd4
    const PANTS = 0x3a5a8a
    const SHOE = 0x2a2a2a
    const TOOL = 0x8b6914

    // 頭
    const head = box(0.28, 0.28, 0.28, SKIN)
    head.position.set(0, 0.72, 0)
    head.castShadow = true
    group.add(head)

    // 目（黒い小さなbox）
    const eyeL = box(0.06, 0.06, 0.02, 0x222222)
    eyeL.position.set(-0.07, 0.74, 0.145)
    group.add(eyeL)
    const eyeR = box(0.06, 0.06, 0.02, 0x222222)
    eyeR.position.set(0.07, 0.74, 0.145)
    group.add(eyeR)

    // 髪
    const hair = box(0.3, 0.1, 0.3, HAIR)
    hair.position.set(0, 0.9, 0)
    group.add(hair)

    // 胴体
    const body = box(0.28, 0.32, 0.2, SHIRT)
    body.position.set(0, 0.44, 0)
    body.castShadow = true
    group.add(body)

    // 左腕
    const armL = box(0.1, 0.28, 0.1, SHIRT)
    armL.position.set(-0.19, 0.44, 0)
    armL.castShadow = true
    group.add(armL)

    // 右腕（道具を持つ）
    const armR = box(0.1, 0.28, 0.1, SHIRT)
    armR.position.set(0.19, 0.44, 0)
    armR.castShadow = true
    group.add(armR)

    // 道具（鎌）
    const toolHandle = box(0.05, 0.35, 0.05, TOOL)
    toolHandle.position.set(0.19, 0.22, 0)
    group.add(toolHandle)
    const toolBlade = box(0.18, 0.05, 0.05, 0xcccccc)
    toolBlade.position.set(0.28, 0.08, 0)
    group.add(toolBlade)

    // 左脚
    const legL = box(0.11, 0.28, 0.12, PANTS)
    legL.position.set(-0.09, 0.14, 0)
    legL.castShadow = true
    group.add(legL)

    // 右脚
    const legR = box(0.11, 0.28, 0.12, PANTS)
    legR.position.set(0.09, 0.14, 0)
    legR.castShadow = true
    group.add(legR)

    // 靴
    const shoeL = box(0.13, 0.07, 0.16, SHOE)
    shoeL.position.set(-0.09, 0.035, 0.02)
    group.add(shoeL)
    const shoeR = box(0.13, 0.07, 0.16, SHOE)
    shoeR.position.set(0.09, 0.035, 0.02)
    group.add(shoeR)

    group.position.copy(WAYPOINTS[0])
    scene.add(group)

    // ---- アニメーション状態 ----
    let state: CharState = 'work'
    let stateTimer = 0
    const WORK_DURATION = 8.0   // 8秒作業
    const REST_DURATION = 3.0   // 3秒休憩

    let waypointIndex = 0
    let moving = false
    let moveTimer = 0
    const MOVE_INTERVAL = 12.0  // 12秒ごとに移動
    const MOVE_SPEED = 0.8

    const targetPos = new THREE.Vector3()
    targetPos.copy(WAYPOINTS[0])

    function update(time: number, delta: number): void {
        stateTimer += delta
        moveTimer += delta

        // ---- 状態遷移 ----
        if (state === 'work' && stateTimer > WORK_DURATION) {
            state = 'rest'
            stateTimer = 0
        } else if (state === 'rest' && stateTimer > REST_DURATION) {
            state = 'work'
            stateTimer = 0
        }

        // ---- 移動トリガー ----
        if (!moving && moveTimer > MOVE_INTERVAL) {
            moveTimer = 0
            moving = true
            waypointIndex = (waypointIndex + 1) % WAYPOINTS.length
            targetPos.copy(WAYPOINTS[waypointIndex])
        }

        // ---- 移動 ----
        if (moving) {
            const diff = targetPos.clone().sub(group.position)
            diff.y = 0
            const dist = diff.length()
            if (dist < 0.05) {
                moving = false
                group.position.copy(targetPos)
            } else {
                const step = Math.min(MOVE_SPEED * delta, dist)
                group.position.addScaledVector(diff.normalize(), step)
                // 進行方向を向く
                group.rotation.y = Math.atan2(diff.x, diff.z)
            }
        }

        // ---- 作業アニメ ----
        if (state === 'work' && !moving) {
            // 草刈り: 右腕を振る
            armR.rotation.x = Math.sin(time * 4.0) * 0.6 - 0.3
            toolHandle.rotation.x = armR.rotation.x
            toolBlade.rotation.x = armR.rotation.x
            armL.rotation.x = -Math.sin(time * 4.0) * 0.2
            // 体の微妙な揺れ
            body.rotation.z = Math.sin(time * 4.0) * 0.03
            head.rotation.z = body.rotation.z * 0.5
            legL.rotation.x = Math.sin(time * 4.0) * 0.05
            legR.rotation.x = -Math.sin(time * 4.0) * 0.05
        } else if (state === 'rest') {
            // 休憩: しゃがむ（全体を下げる）
            const squat = Math.max(0, Math.sin(stateTimer * Math.PI / REST_DURATION))
            group.position.y = WAYPOINTS[waypointIndex].y - squat * 0.12
            armR.rotation.x = 0.3
            armL.rotation.x = 0.3
            body.rotation.z = 0
            head.rotation.z = 0
            legL.rotation.x = 0
            legR.rotation.x = 0
        } else if (moving) {
            // 歩行: 腕と脚を振る
            armR.rotation.x = Math.sin(time * 6.0) * 0.4
            armL.rotation.x = -Math.sin(time * 6.0) * 0.4
            legL.rotation.x = -Math.sin(time * 6.0) * 0.4
            legR.rotation.x = Math.sin(time * 6.0) * 0.4
            body.rotation.z = 0
            head.rotation.z = 0
        }
    }

    return { group, update }
}
