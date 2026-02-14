import * as THREE from "three"

import { PixelEngine } from "./PixelEngine"
import { createGround } from "./objects/Ground"
import { createNightSky } from "./objects/NightSky"
import { createTrack } from "./objects/Track"
import { createTrain } from "./objects/Train"
import { createStation } from "./objects/Station"
import { createScenery } from "./objects/Scenery"

// =========================================
//  Pixel Train Set — メインエントリポイント
// =========================================

const engine = new PixelEngine({
    pixelSize: 4,
    backgroundColor: 0x0a0a2e,  // 深い夜空色
    bloomStrength: 0.4,          // 光を強調
    bloomRadius: 0.2,
    bloomThreshold: 0.6,
    cameraPosition: new THREE.Vector3(6, 8, 6),
})

const { scene } = engine

// --- シーンオブジェクトの配置 ---
createGround(scene)
createNightSky(scene)
const trackCurve = createTrack(scene)
const train = createTrain(scene, trackCurve, 0.03, 2)
createStation(scene)
const scenery = createScenery(scene)

// --- ライティング（夜間） ---
// 環境光: 夜の柔らかい青白い光（しっかり見える程度に）
scene.add(new THREE.AmbientLight(0x4466aa, 1.2))

// 月明かり: しっかり照らす DirectionalLight（青白い）
const moonLight = new THREE.DirectionalLight(0x8899cc, 0.8)
moonLight.position.set(-3, 5, -4)
moonLight.castShadow = true
moonLight.shadow.mapSize.set(2048, 2048)
moonLight.shadow.camera.near = 0.1
moonLight.shadow.camera.far = 50
moonLight.shadow.camera.left = -10
moonLight.shadow.camera.right = 10
moonLight.shadow.camera.top = 10
moonLight.shadow.camera.bottom = -10
scene.add(moonLight)

// --- アニメーション開始 ---
engine.start((time) => {
    train.update(time)
    scenery.update(time)
})
