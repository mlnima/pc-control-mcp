import koffi from 'koffi';
import {
    SendInput, MapVirtualKeyExW,
    INPUT, INPUT_MOUSE, INPUT_KEYBOARD,
    MOUSEEVENTF_MOVE, MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP,
    MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP, MOUSEEVENTF_MIDDLEDOWN, MOUSEEVENTF_MIDDLEUP,
    MOUSEEVENTF_WHEEL, KEYEVENTF_KEYUP, KEYEVENTF_SCANCODE, MAPVK_VK_TO_VSC
} from './win32.js';

const KEYEVENTF_UNICODE_VAL = 0x0004;
const inputSize = koffi.sizeof(INPUT);

export const mouseMoveDelta = (dx: number, dy: number) => {
    const input = {
        type: INPUT_MOUSE,
        u: { mi: { dx, dy, mouseData: 0, dwFlags: MOUSEEVENTF_MOVE, time: 0, dwExtraInfo: 0n } }
    };
    SendInput(1, [input], inputSize);
};

export const click = (button: 'left' | 'right' | 'middle') => {
    const downFlag = button === 'right' ? MOUSEEVENTF_RIGHTDOWN : (button === 'middle' ? MOUSEEVENTF_MIDDLEDOWN : MOUSEEVENTF_LEFTDOWN);
    const upFlag = button === 'right' ? MOUSEEVENTF_RIGHTUP : (button === 'middle' ? MOUSEEVENTF_MIDDLEUP : MOUSEEVENTF_LEFTUP);

    const down = { type: INPUT_MOUSE, u: { mi: { dx: 0, dy: 0, mouseData: 0, dwFlags: downFlag, time: 0, dwExtraInfo: 0n } } };
    const up = { type: INPUT_MOUSE, u: { mi: { dx: 0, dy: 0, mouseData: 0, dwFlags: upFlag, time: 0, dwExtraInfo: 0n } } };
    SendInput(2, [down, up], inputSize);
};

export const scroll = (delta: number) => {
    const input = { type: INPUT_MOUSE, u: { mi: { dx: 0, dy: 0, mouseData: delta, dwFlags: MOUSEEVENTF_WHEEL, time: 0, dwExtraInfo: 0n } } };
    SendInput(1, [input], inputSize);
};

export const drag = (dx: number, dy: number, button: 'left' | 'right' | 'middle') => {
    const downFlag = button === 'right' ? MOUSEEVENTF_RIGHTDOWN : (button === 'middle' ? MOUSEEVENTF_MIDDLEDOWN : MOUSEEVENTF_LEFTDOWN);
    const upFlag = button === 'right' ? MOUSEEVENTF_RIGHTUP : (button === 'middle' ? MOUSEEVENTF_MIDDLEUP : MOUSEEVENTF_LEFTUP);

    const down = { type: INPUT_MOUSE, u: { mi: { dx: 0, dy: 0, mouseData: 0, dwFlags: downFlag, time: 0, dwExtraInfo: 0n } } };
    const move = { type: INPUT_MOUSE, u: { mi: { dx, dy, mouseData: 0, dwFlags: MOUSEEVENTF_MOVE, time: 0, dwExtraInfo: 0n } } };
    const up = { type: INPUT_MOUSE, u: { mi: { dx: 0, dy: 0, mouseData: 0, dwFlags: upFlag, time: 0, dwExtraInfo: 0n } } };
    SendInput(3, [down, move, up], inputSize);
};

export const keyPressScan = (key: number) => {
    const scanCode = MapVirtualKeyExW(key, MAPVK_VK_TO_VSC, null);
    const down = { type: INPUT_KEYBOARD, u: { ki: { wVk: 0, wScan: scanCode, dwFlags: KEYEVENTF_SCANCODE, time: 0, dwExtraInfo: 0n } } };
    const up = { type: INPUT_KEYBOARD, u: { ki: { wVk: 0, wScan: scanCode, dwFlags: KEYEVENTF_SCANCODE | KEYEVENTF_KEYUP, time: 0, dwExtraInfo: 0n } } };
    SendInput(2, [down, up], inputSize);
};

export const typeText = (text: string) => {
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
