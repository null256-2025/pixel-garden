import * as THREE from "three"
import { Vector2 } from "three"

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'

import RenderPixelatedPass from "./RenderPixelatedPass"
import PixelatePass from "./PixelatePass"

// =========================================
//  PixelEngine 設定オプション
// =========================================
export interface PixelEngineOptions {
    /** ピクセル化の粗さ（画面解像度をこの値で割る）。デフォルト: 6 */
    pixelSize?: number
    /** 背景色。デフォルト: スカイブルー */
    backgroundColor?: number
    /** Bloom の強度。デフォルト: 0.15 */
    bloomStrength?: number
    /** Bloom の半径。デフォルト: 0.1 */
    bloomRadius?: number
    /** Bloom の閾値。デフォルト: 0.9 */
    bloomThreshold?: number
    /** カメラの正射影スケール（上下の可視範囲）。デフォルト: 2 */
    cameraScale?: number
    /** カメラ初期位置。デフォルト: (8, 8, 8) */
    cameraPosition?: THREE.Vector3
    /** OrbitControls を有効にするか。デフォルト: true */
    enableControls?: boolean
}

// =========================================
//  PixelEngine — ピクセルアート3D共通基盤
// =========================================
export class PixelEngine {

    scene: THREE.Scene
    camera: THREE.OrthographicCamera
    renderer: THREE.WebGLRenderer
    composer: EffectComposer
    controls: OrbitControls | null = null

    private _onUpdate: ((time: number) => void) | null = null

    constructor(options: PixelEngineOptions = {}) {

        const {
            pixelSize = 6,
            backgroundColor = 0x87CEEB,
            bloomStrength = 0.15,
            bloomRadius = 0.1,
            bloomThreshold = 0.9,
            cameraScale = 2,
            cameraPosition = new THREE.Vector3(8, 8, 8),
            enableControls = true,
        } = options

        // --- 解像度 ---
        const screenResolution = new Vector2(window.innerWidth, window.innerHeight)
        const renderResolution = screenResolution.clone().divideScalar(pixelSize)
        renderResolution.x |= 0
        renderResolution.y |= 0
        const aspectRatio = screenResolution.x / screenResolution.y

        // --- カメラ（正射影・アイソメトリック風） ---
        this.camera = new THREE.OrthographicCamera(
            -aspectRatio * cameraScale, aspectRatio * cameraScale,
            cameraScale, -cameraScale,
            0.1, 100
        )
        this.camera.position.copy(cameraPosition)
        this.camera.lookAt(0, 0, 0)

        // --- シーン ---
        this.scene = new THREE.Scene()
        this.scene.background = new THREE.Color(backgroundColor)

        // --- レンダラー ---
        this.renderer = new THREE.WebGLRenderer({ antialias: false })
        this.renderer.shadowMap.enabled = true
        this.renderer.setSize(screenResolution.x, screenResolution.y)
        document.body.appendChild(this.renderer.domElement)

        // --- ポストプロセス ---
        this.composer = new EffectComposer(this.renderer)
        this.composer.addPass(new RenderPixelatedPass(renderResolution, this.scene, this.camera))
        const bloomPass = new UnrealBloomPass(screenResolution, bloomStrength, bloomRadius, bloomThreshold)
        this.composer.addPass(bloomPass)
        this.composer.addPass(new PixelatePass(renderResolution))

        // --- カメラ操作 ---
        if (enableControls) {
            this.controls = new OrbitControls(this.camera, this.renderer.domElement)
            this.controls.target.set(0, 0, 0)
            this.controls.enableDamping = true
            this.controls.dampingFactor = 0.05

            // マウス操作のカスタマイズ
            this.controls.mouseButtons = {
                LEFT: null as any, // 左クリックでの回転を無効化（描画ツールと競合するため）
                MIDDLE: THREE.MOUSE.ROTATE, // 中（ホイール）クリックで回転
                RIGHT: THREE.MOUSE.PAN // 右クリックでパン移動
            }

            this.controls.update()
        }

        // --- ウィンドウリサイズ対応 ---
        window.addEventListener('resize', () => {
            const w = window.innerWidth
            const h = window.innerHeight
            const ar = w / h
            this.camera.left = -ar * cameraScale
            this.camera.right = ar * cameraScale
            this.camera.top = cameraScale
            this.camera.bottom = -cameraScale
            this.camera.updateProjectionMatrix()
            this.renderer.setSize(w, h)
        })
    }

    /** アニメーションループを開始する */
    start(onUpdate?: (time: number) => void) {
        this._onUpdate = onUpdate ?? null
        this._animate()
    }

    private _animate = () => {
        requestAnimationFrame(this._animate)
        const t = performance.now() / 1000
        this._onUpdate?.(t)
        this.controls?.update()
        this.composer.render()
    }
}
