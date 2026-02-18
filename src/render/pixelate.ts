// =============================================
//  pixelate.ts — 低解像度ピクセルレンダリング
// =============================================
import * as THREE from 'three'

export class PixelRenderer {
    private renderer: THREE.WebGLRenderer
    private renderTarget: THREE.WebGLRenderTarget
    private fsCamera: THREE.OrthographicCamera
    private fsScene: THREE.Scene
    private fsQuad: THREE.Mesh
    private pixelDensity: number

    constructor(renderer: THREE.WebGLRenderer, pixelDensity = 2) {
        this.renderer = renderer
        this.pixelDensity = pixelDensity

        // フルスクリーン quad 用カメラ
        this.fsCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
        this.fsScene = new THREE.Scene()

        // 低解像度レンダーターゲット
        this.renderTarget = this._makeTarget()

        // nearest フィルタで拡大するマテリアル
        const mat = new THREE.MeshBasicMaterial({
            map: this.renderTarget.texture,
        })
        this.renderTarget.texture.magFilter = THREE.NearestFilter
        this.renderTarget.texture.minFilter = THREE.NearestFilter

        const geo = new THREE.PlaneGeometry(2, 2)
        this.fsQuad = new THREE.Mesh(geo, mat)
        this.fsScene.add(this.fsQuad)
    }

    private _makeTarget(): THREE.WebGLRenderTarget {
        const w = Math.floor(window.innerWidth / this.pixelDensity)
        const h = Math.floor(window.innerHeight / this.pixelDensity)
        const rt = new THREE.WebGLRenderTarget(w, h, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
        })
        return rt
    }

    setPixelDensity(density: number): void {
        this.pixelDensity = density
        this.renderTarget.dispose()
        this.renderTarget = this._makeTarget()
            ; (this.fsQuad.material as THREE.MeshBasicMaterial).map = this.renderTarget.texture
            ; (this.fsQuad.material as THREE.MeshBasicMaterial).needsUpdate = true
    }

    onResize(): void {
        this.renderTarget.dispose()
        this.renderTarget = this._makeTarget()
            ; (this.fsQuad.material as THREE.MeshBasicMaterial).map = this.renderTarget.texture
            ; (this.fsQuad.material as THREE.MeshBasicMaterial).needsUpdate = true
        this.renderer.setSize(window.innerWidth, window.innerHeight)
    }

    render(scene: THREE.Scene, camera: THREE.Camera): void {
        // 1. 低解像度ターゲットに描画
        this.renderer.setRenderTarget(this.renderTarget)
        this.renderer.render(scene, camera)
        // 2. nearest 拡大でスクリーンに出力
        this.renderer.setRenderTarget(null)
        this.renderer.render(this.fsScene, this.fsCamera)
    }

    dispose(): void {
        this.renderTarget.dispose()
    }
}
