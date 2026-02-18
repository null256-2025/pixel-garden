// =============================================
//  main.ts — Pixel Garden メインエントリポイント
// =============================================
import * as THREE from 'three'
import { PixelRenderer } from './render/pixelate'
import { createIsland, updateIsland, type ThemeName } from './scene/createIsland'
import { createCharacter } from './scene/createCharacter'
import { ContextMenu } from './ui/contextMenu'
import { loadSave, writeSave, resetSave, isUnlocked, type SaveData } from './state/storage'

// =============================================
//  初期化
// =============================================

// --- セーブデータ読み込み ---
let save: SaveData = loadSave()

// --- レンダラー ---
const renderer = new THREE.WebGLRenderer({ antialias: false })
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

// --- ピクセルレンダラー ---
const pixelRenderer = new PixelRenderer(renderer, save.pixelDensity)

// --- シーン ---
const scene = new THREE.Scene()

// --- カメラ（正射影・アイソメ） ---
const CAM_SCALE = 5.0
let aspect = window.innerWidth / window.innerHeight
const camera = new THREE.OrthographicCamera(
    -aspect * CAM_SCALE, aspect * CAM_SCALE,
    CAM_SCALE, -CAM_SCALE,
    0.1, 200
)

// ---- カメラ位置プリセット ----
type ViewPreset = 'isometric' | 'left' | 'right' | 'top'

const VIEW_PRESETS: Record<ViewPreset, { pos: THREE.Vector3; target: THREE.Vector3 }> = {
    isometric: {
        pos: new THREE.Vector3(10, 10, 10),
        target: new THREE.Vector3(0, 0, 0),
    },
    left: {
        pos: new THREE.Vector3(-15, 8, 0),
        target: new THREE.Vector3(0, 0, 0),
    },
    right: {
        pos: new THREE.Vector3(15, 8, 0),
        target: new THREE.Vector3(0, 0, 0),
    },
    top: {
        pos: new THREE.Vector3(0, 20, 0.001),
        target: new THREE.Vector3(0, 0, 0),
    },
}

function applyViewPreset(preset: ViewPreset): void {
    const { pos, target } = VIEW_PRESETS[preset]
    camState.spherical.setFromVector3(pos.clone().sub(target))
    camState.target.copy(target)
    updateCameraFromSpherical()
}

// --- ライティング ---
const ambientLight = new THREE.AmbientLight(0xfff5e6, 0.7)
scene.add(ambientLight)

const sunLight = new THREE.DirectionalLight(0xfffde0, 1.0)
sunLight.position.set(8, 12, 6)
sunLight.castShadow = true
sunLight.shadow.mapSize.set(1024, 1024)
sunLight.shadow.camera.near = 0.1
sunLight.shadow.camera.far = 60
sunLight.shadow.camera.left = -12
sunLight.shadow.camera.right = 12
sunLight.shadow.camera.top = 12
sunLight.shadow.camera.bottom = -12
scene.add(sunLight)

// =============================================
//  シーン生成
// =============================================
const islandObjects = createIsland(
    scene,
    save.theme as ThemeName,
    isUnlocked('prop30m', save.totalPlaySec)
)
const character = createCharacter(scene)

// =============================================
//  カメラ操作（左ドラッグ回転・ホイールズーム）
// =============================================
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

const MIN_PHI = 0.18        // 仰角下限 (~10°)
const MAX_PHI = 1.35        // 仰角上限 (~77°)
const MIN_ZOOM = 0.4
const MAX_ZOOM = 2.5

function updateCameraFromSpherical(): void {
    const pos = new THREE.Vector3()
    pos.setFromSpherical(camState.spherical)
    pos.add(camState.target)
    camera.position.copy(pos)
    camera.lookAt(camState.target)
    camera.updateProjectionMatrix()
}

// 初期カメラ位置
updateCameraFromSpherical()

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
//  コンテキストメニュー
// =============================================
const contextMenu = new ContextMenu({
    setView: (view) => applyViewPreset(view),
    setTheme: (theme) => {
        save.theme = theme
        writeSave(save)
        islandObjects.updateTheme(theme)
        // ライトも再追加（シーンクリア後）
        scene.add(ambientLight)
        scene.add(sunLight)
        character.group.parent || scene.add(character.group)
    },
    setPixelDensity: (density) => {
        save.pixelDensity = density
        writeSave(save)
        pixelRenderer.setPixelDensity(density)
    },
    reset: () => {
        resetSave()
        save = loadSave()
        location.reload()
    },
    getTotalSec: () => save.totalPlaySec,
    getCurrentTheme: () => save.theme as ThemeName,
    getCurrentDensity: () => save.pixelDensity,
})

contextMenu.onShow(() => { camState.menuOpen = true })
contextMenu.onHide(() => { camState.menuOpen = false })

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
    pixelRenderer.onResize()
})

// =============================================
//  プレイ時間カウント & 自動セーブ
// =============================================
let lastSaveTime = performance.now()
const SAVE_INTERVAL_MS = 10_000  // 10秒ごとに保存

// =============================================
//  アニメーションループ
// =============================================
let prevTime = performance.now() / 1000

function animate(): void {
    requestAnimationFrame(animate)

    const now = performance.now() / 1000
    const delta = Math.min(now - prevTime, 0.1)  // 最大0.1秒でクランプ
    prevTime = now

    // プレイ時間加算
    save.totalPlaySec += delta

    // 自動セーブ
    if (performance.now() - lastSaveTime > SAVE_INTERVAL_MS) {
        writeSave(save)
        lastSaveTime = performance.now()
    }

    // シーン更新
    updateIsland(islandObjects, now, delta)
    character.update(now, delta)

    // 描画
    pixelRenderer.render(scene, camera)
}

// 初期プリセット適用
applyViewPreset('isometric')
animate()
