// =============================================
//  main.ts — Pixel Garden メインエントリポイント
//  デザイン: feature/garden-test スタイル
//  機能: 右クリックメニュー・カメラ操作・セーブ を保持
// =============================================
import * as THREE from 'three'
import { PixelEngine } from './PixelEngine'
import { createGround } from './objects/Ground'
import { createClouds, updateClouds } from './objects/Clouds'
import { createTrees, createGroundGrass } from './objects/Trees'
import { createHouse } from './objects/House'
import { createFlowerbeds } from './objects/Flowerbeds'
import { ContextMenu } from './ui/contextMenu'
import { loadSave, writeSave, resetSave, type SaveData } from './state/storage'

// =============================================
//  セーブデータ読み込み
// =============================================
let save: SaveData = loadSave()

// =============================================
//  PixelEngine 初期化
// =============================================
const engine = new PixelEngine({
    pixelSize: save.pixelDensity * 2,   // pixelDensity(1-3) → pixelSize(2/4/6)
    backgroundColor: 0x87CEEB,
    bloomStrength: 0.15,
    bloomRadius: 0.1,
    bloomThreshold: 0.9,
    cameraScale: 2,
    cameraPosition: new THREE.Vector3(8, 8, 8),
    enableControls: false,             // 独自カメラ操作を使うためOFF
})

const { scene, camera, renderer, composer } = engine

// =============================================
//  シーン生成（garden-test スタイル）
// =============================================
createGround(scene)
createHouse(scene)
createTrees(scene)
createGroundGrass(scene)
createFlowerbeds(scene)
const clouds = createClouds(scene)

// =============================================
//  ライティング
// =============================================
const ambientLight = new THREE.AmbientLight(0xfff5e6, 0.8)
scene.add(ambientLight)

const sunLight = new THREE.DirectionalLight(0xfffde0, 1.0)
sunLight.position.set(5, 10, 5)
sunLight.castShadow = true
sunLight.shadow.mapSize.set(2048, 2048)
sunLight.shadow.camera.near = 0.1
sunLight.shadow.camera.far = 50
sunLight.shadow.camera.left = -10
sunLight.shadow.camera.right = 10
sunLight.shadow.camera.top = 10
sunLight.shadow.camera.bottom = -10
scene.add(sunLight)

// =============================================
//  カメラ操作（左ドラッグ回転・ホイールズーム）
// =============================================
const CAM_SCALE = 2.0
let aspect = window.innerWidth / window.innerHeight

interface CamState {
    spherical: THREE.Spherical
    target: THREE.Vector3
    zoom: number
    isDragging: boolean
    lastX: number
    lastY: number
    menuOpen: boolean
}

const camState: CamState = {
    spherical: new THREE.Spherical(20, Math.PI / 4, Math.PI / 4),
    target: new THREE.Vector3(0, 0, 0),
    zoom: 1.0,
    isDragging: false,
    lastX: 0,
    lastY: 0,
    menuOpen: false,
}

const MIN_PHI = 0.18
const MAX_PHI = 1.35
const MIN_ZOOM = 0.4
const MAX_ZOOM = 3.0

function updateCameraFromSpherical(): void {
    const pos = new THREE.Vector3()
    pos.setFromSpherical(camState.spherical)
    pos.add(camState.target)
    camera.position.copy(pos)
    camera.lookAt(camState.target)
    camera.updateProjectionMatrix()
}

// ---- カメラ位置プリセット ----
type ViewPreset = 'isometric' | 'left' | 'right' | 'top'

const VIEW_PRESETS: Record<ViewPreset, { pos: THREE.Vector3; target: THREE.Vector3 }> = {
    isometric: { pos: new THREE.Vector3(10, 10, 10), target: new THREE.Vector3(0, 0, 0) },
    left: { pos: new THREE.Vector3(-15, 8, 0), target: new THREE.Vector3(0, 0, 0) },
    right: { pos: new THREE.Vector3(15, 8, 0), target: new THREE.Vector3(0, 0, 0) },
    top: { pos: new THREE.Vector3(0, 20, 0.001), target: new THREE.Vector3(0, 0, 0) },
}

function applyViewPreset(preset: ViewPreset): void {
    const { pos, target } = VIEW_PRESETS[preset]
    camState.spherical.setFromVector3(pos.clone().sub(target))
    camState.target.copy(target)
    updateCameraFromSpherical()
}

// 初期カメラ位置
applyViewPreset('isometric')

// ---- ポインターイベント ----
renderer.domElement.addEventListener('pointerdown', (e) => {
    if (camState.menuOpen) return
    if (e.button === 0) {
        camState.isDragging = true
        camState.lastX = e.clientX
        camState.lastY = e.clientY
        renderer.domElement.setPointerCapture(e.pointerId)
    }
})

renderer.domElement.addEventListener('pointermove', (e) => {
    if (!camState.isDragging || camState.menuOpen) return
    const dx = e.clientX - camState.lastX
    const dy = e.clientY - camState.lastY
    camState.lastX = e.clientX
    camState.lastY = e.clientY
    camState.spherical.theta -= dx * 0.008
    camState.spherical.phi = THREE.MathUtils.clamp(
        camState.spherical.phi + dy * 0.006,
        MIN_PHI, MAX_PHI
    )
    updateCameraFromSpherical()
})

renderer.domElement.addEventListener('pointerup', () => {
    camState.isDragging = false
})

// ---- ホイールズーム ----
renderer.domElement.addEventListener('wheel', (e) => {
    if (camState.menuOpen) return
    e.preventDefault()
    camState.zoom = THREE.MathUtils.clamp(
        camState.zoom + e.deltaY * 0.001,
        MIN_ZOOM, MAX_ZOOM
    )
    const s = CAM_SCALE * camState.zoom
    camera.left = -aspect * s
    camera.right = aspect * s
    camera.top = s
    camera.bottom = -s
    camera.updateProjectionMatrix()
}, { passive: false })

// =============================================
//  リサイズ対応
// =============================================
window.addEventListener('resize', () => {
    aspect = window.innerWidth / window.innerHeight
    const s = CAM_SCALE * camState.zoom
    camera.left = -aspect * s
    camera.right = aspect * s
    camera.top = s
    camera.bottom = -s
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
})

// =============================================
//  コンテキストメニュー（右クリック）
// =============================================
const contextMenu = new ContextMenu({
    setView: (view) => applyViewPreset(view),
    setTheme: (_theme) => {
        // garden-test スタイルではテーマ切替なし（将来拡張用）
        save.theme = _theme
        writeSave(save)
    },
    setPixelDensity: (density) => {
        save.pixelDensity = density
        writeSave(save)
        // pixelSize を更新（再ロードで反映）
        location.reload()
    },
    reset: () => {
        resetSave()
        save = loadSave()
        location.reload()
    },
    getTotalSec: () => save.totalPlaySec,
    getCurrentTheme: () => save.theme as import('./scene/createIsland').ThemeName,
    getCurrentDensity: () => save.pixelDensity,
})

contextMenu.onShow(() => { camState.menuOpen = true })
contextMenu.onHide(() => { camState.menuOpen = false })

// =============================================
//  プレイ時間カウント & 自動セーブ
// =============================================
let lastSaveTime = performance.now()
const SAVE_INTERVAL_MS = 10_000

// =============================================
//  アニメーションループ
// =============================================
engine.start(() => {
    save.totalPlaySec += 1 / 60   // 約60fpsで加算

    if (performance.now() - lastSaveTime > SAVE_INTERVAL_MS) {
        writeSave(save)
        lastSaveTime = performance.now()
    }

    updateClouds(clouds)
})
