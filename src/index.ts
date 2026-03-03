import * as THREE from "three"

import { PixelEngine } from "./PixelEngine"
import { createGround } from "./objects/Ground"
import { PathDrawer } from "./editor/PathDrawer"
import { TerrainSculptor } from "./editor/TerrainSculptor"
import { NaturePlacer } from "./editor/NaturePlacer"
import { DestroyerTool } from "./editor/DestroyerTool"
import { DrawPalette } from "./editor/DrawPalette"

import { SpawnManager } from "./editor/SpawnManager"
import { NeonManager } from "./managers/NeonManager"
import { TrafficManager } from "./managers/TrafficManager"
import { CrowdManager } from "./managers/CrowdManager"
import { createSingleTestPedestrian } from "./objects/Pedestrians"

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

// SpawnManager is used for managing the lifecycle of elements that appear over time
const spawnManager = new SpawnManager(scene)
const naturePlacer = new NaturePlacer(camera, scene, domElement, terrainSculptor, spawnManager, neonManager)
naturePlacer.setGround(ground)

// destroyerTool には暫定の physics (null) を渡す
const destroyerTool = new DestroyerTool(camera, scene, domElement, null as any, [])

// パレットUIの生成
new DrawPalette(pathDrawer, terrainSculptor, naturePlacer, destroyerTool)

// --- Traffic (車) の初期設定 ---
// 車の最大数を5台に制限
const trafficManager = new TrafficManager(scene, 5)

// デバッグ・テスト用のテスト道路パス（都市中心を囲む大きな角丸四角形）を生成
const roadPoints = [
    new THREE.Vector3(5.5, 0, 5.5),
    new THREE.Vector3(5.5, 0, -5.5),
    new THREE.Vector3(-5.5, 0, -5.5),
    new THREE.Vector3(-5.5, 0, 5.5)
]
const testRoad = new THREE.CatmullRomCurve3(roadPoints, true, 'centripetal', 0.5)

// 道路パスの視覚化（テスト完了のため非表示）
const tubeGeom = new THREE.TubeGeometry(testRoad, 64, 0.1, 4, true)
const tubeMat = new THREE.MeshBasicMaterial({ color: 0x444444, wireframe: true, opacity: 0.3, transparent: true })
const tubeMesh = new THREE.Mesh(tubeGeom, tubeMat)
tubeMesh.position.y = 0.05
tubeMesh.visible = false
scene.add(tubeMesh)

trafficManager.addPath(testRoad)

// 車の生成 (フェーズ3中は自動で初期配置されるため手動ループは削除)

// --- Crowd (人) の初期設定 ---
// 人の最大数を10人に制限
const crowdManager = new CrowdManager(scene, 10)

// 道路の内側（歩道）を想定した一回り小さいパス
const sidewalkPoints = [
    new THREE.Vector3(4.5, 0, 4.5),
    new THREE.Vector3(4.5, 0, -4.5),
    new THREE.Vector3(-4.5, 0, -4.5),
    new THREE.Vector3(-4.5, 0, 4.5)
]
const testSidewalk = new THREE.CatmullRomCurve3(sidewalkPoints, true, 'centripetal', 0.5)

// 歩道パスの視覚化（テスト完了のため非表示）
const sidewalkTubeGeom = new THREE.TubeGeometry(testSidewalk, 64, 0.05, 4, true)
const sidewalkTubeMat = new THREE.MeshBasicMaterial({ color: 0x44aa44, wireframe: true, opacity: 0.3, transparent: true })
const sidewalkTubeMesh = new THREE.Mesh(sidewalkTubeGeom, sidewalkTubeMat)
sidewalkTubeMesh.position.y = 0.05
sidewalkTubeMesh.visible = false
scene.add(sidewalkTubeMesh)

crowdManager.addPath(testSidewalk)

// 人を生成 (フェーズ3中は自動で初期配置されるため、ここでの手動ループは削除)

// =========================================
// フェーズ3: モデル確認用の単体配置
// =========================================
// 車のテストモデルは非表示に
// const testCar = createSingleTestCar()
// testCar.position.set(-2, 0, 0) // 中心から少し左へずらす
// scene.add(testCar)

// モデル確認用の明るいスポットライト
const testLight = new THREE.SpotLight(0xffffff, 2.0)
testLight.position.set(0, 5, 5)
testLight.target.position.set(0, 0, 0)
scene.add(testLight)
scene.add(testLight.target)

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
    spawnManager.update(time)
    trafficManager.update(dt)
    crowdManager.update(dt)
})
