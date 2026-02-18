// =============================================
//  contextMenu.ts — 右クリックコンテキストメニュー
// =============================================
import type { ThemeName } from '../scene/createIsland'
import { isUnlocked } from '../state/storage'

export interface MenuCallbacks {
    setView: (view: 'isometric' | 'left' | 'right' | 'top') => void
    setTheme: (theme: ThemeName) => void
    setPixelDensity: (density: number) => void
    reset: () => void
    getTotalSec: () => number
    getCurrentTheme: () => ThemeName
    getCurrentDensity: () => number
}

export class ContextMenu {
    private el: HTMLElement
    private visible = false
    private cbs: MenuCallbacks
    private _onShow: (() => void) | null = null
    private _onHide: (() => void) | null = null

    constructor(cbs: MenuCallbacks) {
        this.cbs = cbs
        this.el = document.getElementById('ctx-menu')!

        // 右クリックで表示
        window.addEventListener('contextmenu', (e) => {
            e.preventDefault()
            this._show(e.clientX, e.clientY)
        })

        // メニュー外クリックで閉じる
        window.addEventListener('pointerdown', (e) => {
            if (this.visible && !this.el.contains(e.target as Node)) {
                this._hide()
            }
        })
    }

    onShow(fn: () => void): void { this._onShow = fn }
    onHide(fn: () => void): void { this._onHide = fn }

    private _show(x: number, y: number): void {
        this.visible = true
        this._render()
        this.el.classList.add('visible')

        // 画面端からはみ出さないよう位置調整
        const rect = this.el.getBoundingClientRect()
        const px = Math.min(x, window.innerWidth - rect.width - 8)
        const py = Math.min(y, window.innerHeight - rect.height - 8)
        this.el.style.left = `${px}px`
        this.el.style.top = `${py}px`

        this._onShow?.()
    }

    private _hide(): void {
        this.visible = false
        this.el.classList.remove('visible')
        this._onHide?.()
    }

    private _render(): void {
        const totalSec = this.cbs.getTotalSec()
        const currentTheme = this.cbs.getCurrentTheme()
        const currentDensity = this.cbs.getCurrentDensity()
        const theme2Unlocked = isUnlocked('theme2', totalSec)
        const theme3Unlocked = isUnlocked('theme3', totalSec)

        this.el.innerHTML = `
      <div class="ctx-section">
        <div class="ctx-label">View</div>
        ${this._item('🏔️ Isometric', 'view-iso')}
        ${this._item('◀ Left', 'view-left')}
        ${this._item('▶ Right', 'view-right')}
        ${this._item('⬆ Top', 'view-top')}
      </div>
      <div class="ctx-section">
        <div class="ctx-label">Theme</div>
        ${this._item('🌿 Default', 'theme-default', currentTheme === 'default')}
        ${this._item('🌸 Theme 2', 'theme-theme2', currentTheme === 'theme2', !theme2Unlocked)}
        ${this._item('🌙 Theme 3', 'theme-theme3', currentTheme === 'theme3', !theme3Unlocked)}
      </div>
      <div class="ctx-section">
        <div class="ctx-label">Pixel Density</div>
        ${this._item('1x', 'px-1', currentDensity === 1)}
        ${this._item('2x', 'px-2', currentDensity === 2)}
        ${this._item('3x', 'px-3', currentDensity === 3)}
      </div>
      <div class="ctx-section">
        ${this._item('🔄 Reset Save', 'reset')}
      </div>
    `

        // イベント登録
        this._bind('view-iso', () => { this.cbs.setView('isometric'); this._hide() })
        this._bind('view-left', () => { this.cbs.setView('left'); this._hide() })
        this._bind('view-right', () => { this.cbs.setView('right'); this._hide() })
        this._bind('view-top', () => { this.cbs.setView('top'); this._hide() })

        this._bind('theme-default', () => { this.cbs.setTheme('default'); this._hide() })
        if (theme2Unlocked) this._bind('theme-theme2', () => { this.cbs.setTheme('theme2'); this._hide() })
        if (theme3Unlocked) this._bind('theme-theme3', () => { this.cbs.setTheme('theme3'); this._hide() })

        this._bind('px-1', () => { this.cbs.setPixelDensity(1); this._hide() })
        this._bind('px-2', () => { this.cbs.setPixelDensity(2); this._hide() })
        this._bind('px-3', () => { this.cbs.setPixelDensity(3); this._hide() })

        this._bind('reset', () => {
            if (confirm('セーブデータをリセットしますか？')) {
                this.cbs.reset()
                this._hide()
            }
        })
    }

    private _item(label: string, id: string, active = false, locked = false): string {
        const cls = ['ctx-item', active ? 'active' : '', locked ? 'locked' : ''].filter(Boolean).join(' ')
        return `<div class="${cls}" id="ctx-${id}">${label}</div>`
    }

    private _bind(id: string, fn: () => void): void {
        const el = document.getElementById(`ctx-${id}`)
        if (el) el.addEventListener('click', fn)
    }
}
