"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const app_state_1 = require("../shared/app-state");
const STATE_FILE_NAME = "state.json";
const STATE_BACKUP_FILE_NAME = "state.json.bak";
const SAVE_DEBOUNCE_MS = 200;
const SAVE_INTERVAL_MS = 45000;
const SNAP_MARGIN = 20;
const WINDOW_MIN_W = 320;
const WINDOW_MIN_H = 240;
const WINDOW_MAX_W = 1400;
const WINDOW_MAX_H = 1000;
let mainWindow = null;
let stateFilePath = "";
let stateBackupFilePath = "";
let appState = app_state_1.defaultAppState;
let saveDebounceTimer = null;
let periodicSaveTimer = null;
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
}
function isRectVisible(bounds) {
    return electron_1.screen.getAllDisplays().some((display) => {
        const area = display.workArea;
        const horizontalOverlap = bounds.x < area.x + area.width && bounds.x + bounds.w > area.x;
        const verticalOverlap = bounds.y < area.y + area.height && bounds.y + bounds.h > area.y;
        return horizontalOverlap && verticalOverlap;
    });
}
function snapBounds(corner, width, height) {
    const safeW = clamp(width, WINDOW_MIN_W, WINDOW_MAX_W);
    const safeH = clamp(height, WINDOW_MIN_H, WINDOW_MAX_H);
    const display = mainWindow
        ? electron_1.screen.getDisplayMatching(mainWindow.getBounds())
        : electron_1.screen.getPrimaryDisplay();
    const area = display.workArea;
    const x = corner.endsWith("r")
        ? area.x + area.width - safeW - SNAP_MARGIN
        : area.x + SNAP_MARGIN;
    const y = corner.startsWith("b")
        ? area.y + area.height - safeH - SNAP_MARGIN
        : area.y + SNAP_MARGIN;
    return { x, y, w: safeW, h: safeH };
}
function normalizeCorner(value) {
    return value === "bl" || value === "tr" || value === "tl" ? value : "br";
}
function sanitizeWindowBounds(bounds) {
    const safeW = clamp(Math.round(bounds.w), WINDOW_MIN_W, WINDOW_MAX_W);
    const safeH = clamp(Math.round(bounds.h), WINDOW_MIN_H, WINDOW_MAX_H);
    const candidate = {
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
        w: safeW,
        h: safeH
    };
    if (isRectVisible(candidate)) {
        return candidate;
    }
    return snapBounds("br", safeW, safeH);
}
function deepCloneState(state) {
    return JSON.parse(JSON.stringify(state));
}
function loadStateFromDisk() {
    const defaultState = deepCloneState(app_state_1.defaultAppState);
    const sources = [stateFilePath, stateBackupFilePath];
    for (const sourcePath of sources) {
        try {
            if (!node_fs_1.default.existsSync(sourcePath)) {
                continue;
            }
            const raw = node_fs_1.default.readFileSync(sourcePath, "utf-8");
            const parsed = JSON.parse(raw);
            return (0, app_state_1.sanitizeAppState)(parsed);
        }
        catch {
            // Ignore broken source and try next one.
        }
    }
    return defaultState;
}
function saveStateToDisk() {
    try {
        if (!stateFilePath || !stateBackupFilePath) {
            return;
        }
        const serialized = JSON.stringify(appState, null, 2);
        if (node_fs_1.default.existsSync(stateFilePath)) {
            node_fs_1.default.copyFileSync(stateFilePath, stateBackupFilePath);
        }
        node_fs_1.default.writeFileSync(stateFilePath, serialized, "utf-8");
    }
    catch {
        // Swallow save failures to avoid crashing the app.
    }
}
function scheduleSave() {
    if (saveDebounceTimer) {
        clearTimeout(saveDebounceTimer);
    }
    saveDebounceTimer = setTimeout(() => {
        saveDebounceTimer = null;
        saveStateToDisk();
    }, SAVE_DEBOUNCE_MS);
}
function syncWindowBoundsToState() {
    if (!mainWindow) {
        return;
    }
    const [x, y] = mainWindow.getPosition();
    const [w, h] = mainWindow.getSize();
    appState = (0, app_state_1.mergeAppState)(appState, {
        window: {
            x,
            y,
            w,
            h
        }
    });
}
function broadcastState() {
    mainWindow?.webContents.send("state:patched", appState);
}
function sendWindowActivity() {
    if (!mainWindow) {
        return;
    }
    mainWindow.webContents.send("window:activity", {
        active: mainWindow.isFocused(),
        minimized: mainWindow.isMinimized()
    });
}
function applyClickThrough(enabled) {
    if (!mainWindow) {
        return;
    }
    mainWindow.setIgnoreMouseEvents(enabled, { forward: true });
    mainWindow.webContents.send("app:click-through-changed", enabled);
}
function setClickThroughState(enabled) {
    appState = (0, app_state_1.mergeAppState)(appState, { clickThrough: enabled });
    applyClickThrough(appState.clickThrough);
    scheduleSave();
    broadcastState();
}
function rescueWindowIfOffscreen() {
    if (!mainWindow) {
        return;
    }
    const [x, y] = mainWindow.getPosition();
    const [w, h] = mainWindow.getSize();
    const current = { x, y, w, h };
    if (isRectVisible(current)) {
        return;
    }
    const rescued = snapBounds("br", w, h);
    mainWindow.setBounds(rescued);
    syncWindowBoundsToState();
    scheduleSave();
}
function createWindow() {
    if (!appState.restoreLastState) {
        appState = (0, app_state_1.mergeAppState)(app_state_1.defaultAppState, {
            restoreLastState: false,
            firstRunHintShown: appState.firstRunHintShown
        });
    }
    const launchState = appState;
    const windowBounds = sanitizeWindowBounds(launchState.window);
    mainWindow = new electron_1.BrowserWindow({
        width: windowBounds.w,
        height: windowBounds.h,
        x: windowBounds.x,
        y: windowBounds.y,
        minWidth: WINDOW_MIN_W,
        minHeight: WINDOW_MIN_H,
        maxWidth: WINDOW_MAX_W,
        maxHeight: WINDOW_MAX_H,
        frame: false,
        transparent: true,
        hasShadow: false,
        backgroundColor: "#00000000",
        alwaysOnTop: true,
        resizable: true,
        autoHideMenuBar: true,
        webPreferences: {
            preload: node_path_1.default.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    }
    else {
        mainWindow.loadFile(node_path_1.default.join(__dirname, "../../dist/index.html"));
    }
    mainWindow.on("move", () => {
        syncWindowBoundsToState();
        scheduleSave();
    });
    mainWindow.on("resize", () => {
        syncWindowBoundsToState();
        scheduleSave();
    });
    mainWindow.on("focus", sendWindowActivity);
    mainWindow.on("blur", sendWindowActivity);
    mainWindow.on("minimize", sendWindowActivity);
    mainWindow.on("restore", sendWindowActivity);
    mainWindow.on("show", sendWindowActivity);
    mainWindow.on("hide", sendWindowActivity);
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
    applyClickThrough(appState.clickThrough);
    sendWindowActivity();
}
function registerIpcHandlers() {
    electron_1.ipcMain.handle("state:get", () => appState);
    electron_1.ipcMain.handle("state:update", (_event, patch) => {
        const prevClickThrough = appState.clickThrough;
        appState = (0, app_state_1.mergeAppState)(appState, patch);
        if (prevClickThrough !== appState.clickThrough) {
            applyClickThrough(appState.clickThrough);
        }
        scheduleSave();
        broadcastState();
        return appState;
    });
    electron_1.ipcMain.handle("window:moveBy", (_event, payload) => {
        if (!mainWindow) {
            return appState.window;
        }
        const dx = isFiniteNumber(payload.dx) ? payload.dx : 0;
        const dy = isFiniteNumber(payload.dy) ? payload.dy : 0;
        const [x, y] = mainWindow.getPosition();
        mainWindow.setPosition(Math.round(x + dx), Math.round(y + dy));
        syncWindowBoundsToState();
        scheduleSave();
        return appState.window;
    });
    electron_1.ipcMain.handle("window:resizeBy", (_event, payload) => {
        if (!mainWindow) {
            return appState.window;
        }
        const delta = isFiniteNumber(payload.delta) ? payload.delta : 0;
        const [x, y] = mainWindow.getPosition();
        const [w, h] = mainWindow.getSize();
        const nextW = clamp(Math.round(w + delta), WINDOW_MIN_W, WINDOW_MAX_W);
        const nextH = clamp(Math.round(h + delta * 0.76), WINDOW_MIN_H, WINDOW_MAX_H);
        const shiftX = Math.round((nextW - w) / 2);
        const shiftY = Math.round((nextH - h) / 2);
        mainWindow.setBounds({
            x: x - shiftX,
            y: y - shiftY,
            width: nextW,
            height: nextH
        });
        syncWindowBoundsToState();
        scheduleSave();
        return appState.window;
    });
    electron_1.ipcMain.handle("window:snap", (_event, payload) => {
        if (!mainWindow) {
            return appState.window;
        }
        const corner = normalizeCorner(payload.corner);
        const [w, h] = mainWindow.getSize();
        const snapped = snapBounds(corner, w, h);
        mainWindow.setBounds(snapped);
        syncWindowBoundsToState();
        scheduleSave();
        return appState.window;
    });
    electron_1.ipcMain.handle("window:setClickThrough", (_event, payload) => {
        setClickThroughState(!!payload.enabled);
        return appState;
    });
    electron_1.ipcMain.handle("app:pause", (_event, payload) => {
        appState = (0, app_state_1.mergeAppState)(appState, { paused: !!payload.paused });
        scheduleSave();
        broadcastState();
        return appState;
    });
    electron_1.ipcMain.handle("app:quit", () => {
        saveStateToDisk();
        electron_1.app.quit();
    });
}
function registerGlobalShortcuts() {
    electron_1.globalShortcut.register("CommandOrControl+Alt+P", () => {
        setClickThroughState(false);
        if (mainWindow) {
            if (mainWindow.isMinimized()) {
                mainWindow.restore();
            }
            mainWindow.show();
            mainWindow.focus();
        }
    });
}
function setupStatePersistence() {
    const userDataDir = electron_1.app.getPath("userData");
    stateFilePath = node_path_1.default.join(userDataDir, STATE_FILE_NAME);
    stateBackupFilePath = node_path_1.default.join(userDataDir, STATE_BACKUP_FILE_NAME);
    appState = loadStateFromDisk();
}
electron_1.app.whenReady().then(() => {
    setupStatePersistence();
    registerIpcHandlers();
    registerGlobalShortcuts();
    createWindow();
    periodicSaveTimer = setInterval(() => {
        saveStateToDisk();
    }, SAVE_INTERVAL_MS);
    electron_1.screen.on("display-metrics-changed", rescueWindowIfOffscreen);
    electron_1.screen.on("display-added", rescueWindowIfOffscreen);
    electron_1.screen.on("display-removed", rescueWindowIfOffscreen);
    electron_1.app.on("activate", () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on("before-quit", () => {
    if (saveDebounceTimer) {
        clearTimeout(saveDebounceTimer);
        saveDebounceTimer = null;
    }
    if (periodicSaveTimer) {
        clearInterval(periodicSaveTimer);
        periodicSaveTimer = null;
    }
    saveStateToDisk();
});
electron_1.app.on("will-quit", () => {
    electron_1.globalShortcut.unregisterAll();
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
