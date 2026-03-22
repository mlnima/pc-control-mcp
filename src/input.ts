import koffi from 'koffi';
import {
    GetAsyncKeyState,
    INPUT,
    INPUT_KEYBOARD,
    INPUT_MOUSE,
    KEYEVENTF_KEYUP,
    KEYEVENTF_SCANCODE,
    MAPVK_VK_TO_VSC,
    MOUSEEVENTF_LEFTDOWN,
    MOUSEEVENTF_LEFTUP,
    MOUSEEVENTF_MIDDLEDOWN,
    MOUSEEVENTF_MIDDLEUP,
    MOUSEEVENTF_MOVE,
    MOUSEEVENTF_RIGHTDOWN,
    MOUSEEVENTF_RIGHTUP,
    MOUSEEVENTF_WHEEL,
    MapVirtualKeyExW,
    SendInput,
    SetCursorPos,
    VK_ESCAPE
} from './win32.js';
import type { MouseButton } from './core/types.js';

const KEYEVENTF_UNICODE_VAL = 0x0004;
const inputSize = koffi.sizeof(INPUT);

const flagsForButton = (button: MouseButton): { downFlag: number; upFlag: number } => {
    if (button === 'right') {
        return { downFlag: MOUSEEVENTF_RIGHTDOWN, upFlag: MOUSEEVENTF_RIGHTUP };
    }

    if (button === 'middle') {
        return { downFlag: MOUSEEVENTF_MIDDLEDOWN, upFlag: MOUSEEVENTF_MIDDLEUP };
    }

    return { downFlag: MOUSEEVENTF_LEFTDOWN, upFlag: MOUSEEVENTF_LEFTUP };
};

export const mouseMoveDelta = (dx: number, dy: number): void => {
    const input = {
        type: INPUT_MOUSE,
        u: { mi: { dx, dy, mouseData: 0, dwFlags: MOUSEEVENTF_MOVE, time: 0, dwExtraInfo: 0n } }
    };
    SendInput(1, [input], inputSize);
};

export const mouseMoveAbsolute = (x: number, y: number): void => {
    SetCursorPos(Math.round(x), Math.round(y));
};

export const mouseDown = (button: MouseButton): void => {
    const { downFlag } = flagsForButton(button);
    const down = { type: INPUT_MOUSE, u: { mi: { dx: 0, dy: 0, mouseData: 0, dwFlags: downFlag, time: 0, dwExtraInfo: 0n } } };
    SendInput(1, [down], inputSize);
};

export const mouseUp = (button: MouseButton): void => {
    const { upFlag } = flagsForButton(button);
    const up = { type: INPUT_MOUSE, u: { mi: { dx: 0, dy: 0, mouseData: 0, dwFlags: upFlag, time: 0, dwExtraInfo: 0n } } };
    SendInput(1, [up], inputSize);
};

export const click = (button: MouseButton): void => {
    const { downFlag, upFlag } = flagsForButton(button);

    const down = { type: INPUT_MOUSE, u: { mi: { dx: 0, dy: 0, mouseData: 0, dwFlags: downFlag, time: 0, dwExtraInfo: 0n } } };
    const up = { type: INPUT_MOUSE, u: { mi: { dx: 0, dy: 0, mouseData: 0, dwFlags: upFlag, time: 0, dwExtraInfo: 0n } } };
    SendInput(2, [down, up], inputSize);
};

export const scroll = (delta: number): void => {
    const input = { type: INPUT_MOUSE, u: { mi: { dx: 0, dy: 0, mouseData: delta, dwFlags: MOUSEEVENTF_WHEEL, time: 0, dwExtraInfo: 0n } } };
    SendInput(1, [input], inputSize);
};

export const drag = (dx: number, dy: number, button: MouseButton): void => {
    mouseDown(button);
    mouseMoveDelta(dx, dy);
    mouseUp(button);
};

export const keyPressScan = (key: number): void => {
    const scanCode = MapVirtualKeyExW(key, MAPVK_VK_TO_VSC, null);
    const down = { type: INPUT_KEYBOARD, u: { ki: { wVk: 0, wScan: scanCode, dwFlags: KEYEVENTF_SCANCODE, time: 0, dwExtraInfo: 0n } } };
    const up = { type: INPUT_KEYBOARD, u: { ki: { wVk: 0, wScan: scanCode, dwFlags: KEYEVENTF_SCANCODE | KEYEVENTF_KEYUP, time: 0, dwExtraInfo: 0n } } };
    SendInput(2, [down, up], inputSize);
};

export const typeText = (text: string): void => {
    const inputs: any[] = [];
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        inputs.push({ type: INPUT_KEYBOARD, u: { ki: { wVk: 0, wScan: charCode, dwFlags: KEYEVENTF_UNICODE_VAL, time: 0, dwExtraInfo: 0n } } });
        inputs.push({ type: INPUT_KEYBOARD, u: { ki: { wVk: 0, wScan: charCode, dwFlags: KEYEVENTF_UNICODE_VAL | KEYEVENTF_KEYUP, time: 0, dwExtraInfo: 0n } } });
    }
    if (inputs.length > 0) {
        SendInput(inputs.length, inputs, inputSize);
    }
};

export const isEscapePressed = (): boolean => {
    const state = GetAsyncKeyState(VK_ESCAPE);
    return (state & 0x8000) !== 0;
};
