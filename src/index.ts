import * as THREE from "three"
import { PixelEngine } from "./PixelEngine"
import { createFloatingIsland } from "./objects/FloatingIsland"
import { createSmallIslands } from "./objects/SmallIslands"
import { createSkyHouse } from "./objects/SkyHouse"
import { createWaterfall } from "./objects/Waterfall"
import { createCloudSea } from "./objects/CloudSea"
import { createSkyTrees } from "./objects/SkyTrees"
import { createWindmill } from "./objects/Windmill"

// ─── エンジン初期化 ───
const engine = new PixelEngine({
    pixelSize: 4,
    backgroundColor: 0x87CEEB,  // 空色
    bloomStrength: 0.3,
    bloomRadius: 0.2,
    bloomThreshold: 0.8,
    cameraPosition: new THREE.Vector3(8, 10, 8),
})

const { scene } = engine

// ─── ライティング ───
// 空気感のあるヘミスフィアライト
scene.add(new THREE.HemisphereLight(0x87CEEB, 0x444444, 0.6))

// 暖かい太陽光
const sunLight = new THREE.DirectionalLight(0xfff4d6, 0.8)
sunLight.position.set(50, 80, 50)
sunLight.castShadow = true
sunLight.shadow.mapSize.set(2048, 2048)
sunLight.shadow.camera.left = -15
sunLight.shadow.camera.right = 15
sunLight.shadow.camera.top = 15
sunLight.shadow.camera.bottom = -15
sunLight.shadow.camera.far = 200
scene.add(sunLight)

// 柔らかい環境光
scene.add(new THREE.AmbientLight(0x8899bb, 0.4))

// ─── オブジェクト生成 ───
const updates = [
    createFloatingIsland(scene),
    createSmallIslands(scene),
    createSkyHouse(scene),     // update 不要（static）→ undefined
    createWaterfall(scene),
    createCloudSea(scene),
    createSkyTrees(scene),
    createWindmill(scene),
]

// ─── アニメーションループ ───
engine.start((time) => {
    updates.forEach(fn => {
        if (fn) fn(time)
    })
})
