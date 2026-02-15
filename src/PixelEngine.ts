import * as THREE from "three"
import { Vector2 } from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer"
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass"
import RenderPixelatedPass from "./RenderPixelatedPass"
import PixelatePass from "./PixelatePass"

export interface PixelEngineOptions {
    pixelSize?: number
    backgroundColor?: number
    bloomStrength?: number
    bloomRadius?: number
    bloomThreshold?: number
    cameraPosition?: THREE.Vector3
}

export class PixelEngine {
    scene: THREE.Scene
    camera: THREE.OrthographicCamera
    renderer: THREE.WebGLRenderer
    composer: EffectComposer
    controls: OrbitControls

    constructor(options: PixelEngineOptions = {}) {
        const {
            pixelSize = 4,
            backgroundColor = 0x151729,
            bloomStrength = 0.4,
            bloomRadius = 0.2,
            bloomThreshold = 0.9,
            cameraPosition = new THREE.Vector3(2, 2, 2),
        } = options

        const screenResolution = new Vector2(window.innerWidth, window.innerHeight)
        const renderResolution = screenResolution.clone().divideScalar(pixelSize)
        renderResolution.x |= 0
        renderResolution.y |= 0
        const aspectRatio = screenResolution.x / screenResolution.y

        // Camera
        const camSize = 5
        this.camera = new THREE.OrthographicCamera(
            -camSize * aspectRatio, camSize * aspectRatio,
            camSize, -camSize,
            0.1, 100
        )
        this.camera.position.copy(cameraPosition)
        this.camera.lookAt(0, 0, 0)

        // Scene
        this.scene = new THREE.Scene()
        this.scene.background = new THREE.Color(backgroundColor)

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: false })
        this.renderer.shadowMap.enabled = true
        this.renderer.setSize(screenResolution.x, screenResolution.y)
        document.body.appendChild(this.renderer.domElement)

        // Post-processing
        this.composer = new EffectComposer(this.renderer)
        this.composer.addPass(new RenderPixelatedPass(renderResolution, this.scene, this.camera))
        this.composer.addPass(new UnrealBloomPass(screenResolution, bloomStrength, bloomRadius, bloomThreshold))
        this.composer.addPass(new PixelatePass(renderResolution))

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement)
        this.controls.target.set(0, 2, 0)
        this.controls.update()

        // Resize handling
        window.addEventListener("resize", () => {
            const w = window.innerWidth
            const h = window.innerHeight
            const ar = w / h
            this.camera.left = -camSize * ar
            this.camera.right = camSize * ar
            this.camera.top = camSize
            this.camera.bottom = -camSize
            this.camera.updateProjectionMatrix()
            this.renderer.setSize(w, h)
        })
    }

    start(update?: (time: number) => void) {
        const animate = () => {
            requestAnimationFrame(animate)
            const t = performance.now() / 1000
            if (update) update(t)
            this.composer.render()
        }
        animate()
    }
}
