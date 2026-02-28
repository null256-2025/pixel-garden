import * as THREE from "three"

import { PixelEngine } from "./PixelEngine"
import { createGround } from "./objects/Ground"
import { makeTallTower } from "./objects/House"

// =========================================
//  Neon City — メインエントリポイント
// =========================================

const engine = new PixelEngine({
    pixelSize: 3,
    backgroundColor: 0x0d0d2b, // 深い紫〜紺の夜空
    bloomStrength: 0.4,
    bloomRadius: 0.2,
    bloomThreshold: 0.5,
    cameraScale: 5,
})

const { scene } = engine

// --- シーンオブジェクトの配置 ---
createGround(scene)

// --- プレビュー: TallTower（承認後に削除してエディタに統合） ---
makeTallTower(scene, 0, 0)

// --- ライティング（夜景向け） ---
// アンビエント：控えめに全体を照らす
scene.add(new THREE.AmbientLight(0x222244, 0.4))

// 月明かり（ディレクショナル）
const moonLight = new THREE.DirectionalLight(0x5566aa, 0.4)
moonLight.position.set(5, 15, 5)
moonLight.castShadow = true
moonLight.shadow.mapSize.set(2048, 2048)
moonLight.shadow.camera.near = 0.1
moonLight.shadow.camera.far = 50
moonLight.shadow.camera.left = -15
moonLight.shadow.camera.right = 15
moonLight.shadow.camera.top = 15
moonLight.shadow.camera.bottom = -15
scene.add(moonLight)

// ヘミスフィアライト（空と地面の間の柔らかい光）
scene.add(new THREE.HemisphereLight(0x222244, 0x110a22, 0.3))

// --- アニメーション開始 ---
engine.start()
