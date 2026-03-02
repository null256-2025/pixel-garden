import * as THREE from "three"

import { PixelEngine } from "./PixelEngine"
import { createGround } from "./objects/Ground"
import { PathDrawer } from "./editor/PathDrawer"
import { TerrainSculptor } from "./editor/TerrainSculptor"
import { NaturePlacer } from "./editor/NaturePlacer"
import { DestroyerTool } from "./editor/DestroyerTool"
import { DrawPalette } from "./editor/DrawPalette"

import { GrowthManager } from "./editor/GrowthManager"
import { NeonManager } from "./managers/NeonManager"

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

const { scene, camera, renderer } = engine
const domElement = renderer.domElement

const neonManager = new NeonManager()

// --- シーンオブジェクトの配置 ---
const ground = createGround(scene)

// ビルや街灯は NaturePlacer 経由で配置されるか、あるいは事前に手動配置される場合
// NeonManager を適用するために、ツール初期化に渡す

const terrainSculptor = new TerrainSculptor(camera, domElement)
terrainSculptor.setGround(ground)

const pathDrawer = new PathDrawer(camera, scene, domElement)
pathDrawer.setGround(ground)
pathDrawer.setTerrainSculptor(terrainSculptor)

// GrowthManager は、将来的に光る木（Neon Tree）などを育てるために使うかも
const growthManager = new GrowthManager(scene)
const naturePlacer = new NaturePlacer(camera, scene, domElement, terrainSculptor, growthManager, neonManager)
naturePlacer.setGround(ground)

// DestroyerTool には暫定の physics (null) を渡す（本来は PhysicsWorld だが、今回は物理エンジン統合前なのでスタブ化するか後回し。ビル破壊用に後で修正する）
// ひとまず null as any で渡し、trackingObjects を空配列で渡しておく
const destroyerTool = new DestroyerTool(camera, scene, domElement, null as any, [])

// パレットUIの生成
new DrawPalette(pathDrawer, terrainSculptor, naturePlacer, destroyerTool)

// --- ライティング（夜景向け） ---
// アンビエント：少し明るめにしてテスト時の視認性を確保
const ambientLight = new THREE.AmbientLight(0x2a2a44, 0.7)
scene.add(ambientLight)

// --- 明るさ調整スライダー（UI） ---
const sliderContainer = document.createElement('div')
sliderContainer.style.position = 'absolute'
sliderContainer.style.top = '20px'
sliderContainer.style.right = '20px'
sliderContainer.style.color = '#fff'
sliderContainer.style.fontFamily = 'sans-serif'
sliderContainer.style.background = 'rgba(0,0,0,0.5)'
sliderContainer.style.padding = '10px'
sliderContainer.style.borderRadius = '8px'
sliderContainer.style.zIndex = '1000'
sliderContainer.innerHTML = '<label>明るさ <input type="range" id="brightnessSlider" min="0" max="2" step="0.1" value="0.7" style="vertical-align: middle;"></label>'
document.body.appendChild(sliderContainer)

document.getElementById('brightnessSlider')?.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value)
    ambientLight.intensity = val
})

// 月明かり（ディレクショナル）
const moonLight = new THREE.DirectionalLight(0x5566aa, 0.5)
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
scene.add(new THREE.HemisphereLight(0x333355, 0x1a1a33, 0.5))

// --- アニメーション開始 ---
engine.start((time, dt) => {
    neonManager.update(time, dt)
})
