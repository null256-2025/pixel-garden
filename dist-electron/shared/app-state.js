"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultAppState = void 0;
exports.mergeAppState = mergeAppState;
exports.sanitizeAppState = sanitizeAppState;
exports.defaultAppState = {
    window: {
        x: 80,
        y: 80,
        w: 500,
        h: 380
    },
    quality: {
        preset: "medium",
        fpsCap: 60
    },
    audio: {
        bgm: 40,
        ambient: 45
    },
    time: {
        mode: "auto",
        fixed: "day"
    },
    clickThrough: false,
    restoreLastState: true,
    paused: false,
    firstRunHintShown: false
};
const TIME_PRESETS = ["morning", "day", "evening", "night"];
const QUALITY_PRESETS = ["low", "medium", "high"];
const FPS_CAPS = [30, 60];
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function asFiniteNumber(value, fallback) {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function asBoolean(value, fallback) {
    return typeof value === "boolean" ? value : fallback;
}
function mergeAppState(base, patch) {
    const next = {
        ...base,
        window: {
            ...base.window,
            ...(patch.window ?? {})
        },
        quality: {
            ...base.quality,
            ...(patch.quality ?? {})
        },
        audio: {
            ...base.audio,
            ...(patch.audio ?? {})
        },
        time: {
            ...base.time,
            ...(patch.time ?? {})
        }
    };
    if (typeof patch.clickThrough === "boolean") {
        next.clickThrough = patch.clickThrough;
    }
    if (typeof patch.restoreLastState === "boolean") {
        next.restoreLastState = patch.restoreLastState;
    }
    if (typeof patch.paused === "boolean") {
        next.paused = patch.paused;
    }
    if (typeof patch.firstRunHintShown === "boolean") {
        next.firstRunHintShown = patch.firstRunHintShown;
    }
    return sanitizeAppState(next);
}
function sanitizeAppState(value) {
    const source = value ?? {};
    const windowSource = source.window ?? {};
    const qualitySource = source.quality ?? {};
    const audioSource = source.audio ?? {};
    const timeSource = source.time ?? {};
    const qualityPreset = QUALITY_PRESETS.includes(qualitySource.preset)
        ? qualitySource.preset
        : exports.defaultAppState.quality.preset;
    const fpsCap = FPS_CAPS.includes(qualitySource.fpsCap)
        ? qualitySource.fpsCap
        : exports.defaultAppState.quality.fpsCap;
    const timeMode = timeSource.mode === "fixed" || timeSource.mode === "auto"
        ? timeSource.mode
        : exports.defaultAppState.time.mode;
    const fixedPreset = TIME_PRESETS.includes(timeSource.fixed)
        ? timeSource.fixed
        : exports.defaultAppState.time.fixed;
    return {
        window: {
            x: Math.round(asFiniteNumber(windowSource.x, exports.defaultAppState.window.x)),
            y: Math.round(asFiniteNumber(windowSource.y, exports.defaultAppState.window.y)),
            w: Math.round(clamp(asFiniteNumber(windowSource.w, exports.defaultAppState.window.w), 320, 1400)),
            h: Math.round(clamp(asFiniteNumber(windowSource.h, exports.defaultAppState.window.h), 240, 1000))
        },
        quality: {
            preset: qualityPreset,
            fpsCap
        },
        audio: {
            bgm: Math.round(clamp(asFiniteNumber(audioSource.bgm, exports.defaultAppState.audio.bgm), 0, 100)),
            ambient: Math.round(clamp(asFiniteNumber(audioSource.ambient, exports.defaultAppState.audio.ambient), 0, 100))
        },
        time: {
            mode: timeMode,
            fixed: fixedPreset
        },
        clickThrough: asBoolean(source.clickThrough, exports.defaultAppState.clickThrough),
        restoreLastState: asBoolean(source.restoreLastState, exports.defaultAppState.restoreLastState),
        paused: asBoolean(source.paused, exports.defaultAppState.paused),
        firstRunHintShown: asBoolean(source.firstRunHintShown, exports.defaultAppState.firstRunHintShown)
    };
}
