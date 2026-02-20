"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const api = {
    getState: () => electron_1.ipcRenderer.invoke("state:get"),
    updateState: (patch) => electron_1.ipcRenderer.invoke("state:update", patch),
    moveWindowBy: (dx, dy) => electron_1.ipcRenderer.invoke("window:moveBy", { dx, dy }),
    resizeWindowBy: (delta) => electron_1.ipcRenderer.invoke("window:resizeBy", { delta }),
    snapWindow: (corner) => electron_1.ipcRenderer.invoke("window:snap", { corner }),
    setClickThrough: (enabled) => electron_1.ipcRenderer.invoke("window:setClickThrough", { enabled }),
    setPaused: (paused) => electron_1.ipcRenderer.invoke("app:pause", { paused }),
    quit: () => electron_1.ipcRenderer.invoke("app:quit"),
    onMenuToggle: (listener) => {
        const wrapped = () => listener();
        electron_1.ipcRenderer.on("menu:toggle", wrapped);
        return () => electron_1.ipcRenderer.off("menu:toggle", wrapped);
    },
    onClickThroughChanged: (listener) => {
        const wrapped = (_event, enabled) => listener(enabled);
        electron_1.ipcRenderer.on("app:click-through-changed", wrapped);
        return () => electron_1.ipcRenderer.off("app:click-through-changed", wrapped);
    },
    onStatePatched: (listener) => {
        const wrapped = (_event, state) => listener(state);
        electron_1.ipcRenderer.on("state:patched", wrapped);
        return () => electron_1.ipcRenderer.off("state:patched", wrapped);
    },
    onWindowActivity: (listener) => {
        const wrapped = (_event, payload) => listener(payload);
        electron_1.ipcRenderer.on("window:activity", wrapped);
        return () => electron_1.ipcRenderer.off("window:activity", wrapped);
    }
};
electron_1.contextBridge.exposeInMainWorld("ambientAPI", api);
