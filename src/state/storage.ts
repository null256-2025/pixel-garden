// =============================================
//  storage.ts — セーブ/ロード・進行計算
// =============================================

const STORAGE_KEY = 'pixel-garden-save'
const OFFLINE_CAP_SEC = 24 * 60 * 60 // 24時間上限

export interface SaveData {
    totalPlaySec: number     // 累計プレイ秒数
    lastSavedAt: number      // 前回保存時刻 (Date.now())
    theme: string            // 選択中テーマ
    pixelDensity: number     // ピクセル密度 (1/2/3)
}

const DEFAULT_SAVE: SaveData = {
    totalPlaySec: 0,
    lastSavedAt: Date.now(),
    theme: 'default',
    pixelDensity: 2,
}

export function loadSave(): SaveData {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return { ...DEFAULT_SAVE, lastSavedAt: Date.now() }
        const data = JSON.parse(raw) as SaveData
        // オフライン進行: 前回終了からの経過秒を加算（上限24h）
        const elapsed = Math.min(
            (Date.now() - data.lastSavedAt) / 1000,
            OFFLINE_CAP_SEC
        )
        data.totalPlaySec += elapsed
        data.lastSavedAt = Date.now()
        return data
    } catch {
        return { ...DEFAULT_SAVE, lastSavedAt: Date.now() }
    }
}

export function writeSave(data: SaveData): void {
    data.lastSavedAt = Date.now()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function resetSave(): void {
    localStorage.removeItem(STORAGE_KEY)
}

// ---- 解放チェック ----
export type UnlockFeature = 'prop30m' | 'theme2' | 'theme3'

const UNLOCK_THRESHOLDS: Record<UnlockFeature, number> = {
    prop30m: 30 * 60,       // 30分
    theme2: 2 * 60 * 60,   // 2時間
    theme3: 8 * 60 * 60,   // 8時間
}

export function isUnlocked(feature: UnlockFeature, totalSec: number): boolean {
    return totalSec >= UNLOCK_THRESHOLDS[feature]
}
