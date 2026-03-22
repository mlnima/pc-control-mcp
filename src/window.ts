import koffi from 'koffi';
import {
    EnumWindows, EnumWindowsProc, GetWindowTextW, GetWindowTextLengthW,
    SetForegroundWindow, IsWindowVisible, SwitchToThisWindow, GetWindowRect,
    GetWindowThreadProcessId
} from './win32.js';

export interface WindowInfo {
    title: string;
    processId: number;
}

export const listWindows = (): WindowInfo[] => {
    const windows: WindowInfo[] = [];

    const callback = koffi.register((hwnd: any, lParam: any) => {
        if (!IsWindowVisible(hwnd)) return true;

        const len = GetWindowTextLengthW(hwnd);
        if (len === 0) return true;

        const buf = Buffer.alloc((len + 1) * 2);
        GetWindowTextW(hwnd, buf, len + 1);
        const title = buf.toString('utf16le').replace(/\0/g, '');

        if (!title) return true;

        const pidBuf = Buffer.alloc(4);
        GetWindowThreadProcessId(hwnd, pidBuf);
        const processId = pidBuf.readUInt32LE(0);

        windows.push({ title, processId });

        return true;
    }, EnumWindowsProc);

    EnumWindows(callback, null);
    koffi.unregister(callback);

    return windows;
};

export const getWindowByTitleRegex = (titleRegex: string): { hwnd: any, title: string, processId: number } | null => {
    let foundWin: any = null;
    let regex: RegExp;
    try {
        regex = new RegExp(titleRegex, 'i');
    } catch {
        return null; // Invalid regex
    }

    const callback = koffi.register((hwnd: any, lParam: any) => {
        if (!IsWindowVisible(hwnd)) return true;

        const len = GetWindowTextLengthW(hwnd);
        if (len === 0) return true;

        const buf = Buffer.alloc((len + 1) * 2);
        GetWindowTextW(hwnd, buf, len + 1);
        const title = buf.toString('utf16le').replace(/\0/g, '');

        if (regex.test(title)) {
            const pidBuf = Buffer.alloc(4);
            GetWindowThreadProcessId(hwnd, pidBuf);
            foundWin = { hwnd, title, processId: pidBuf.readUInt32LE(0) };
            return false;
        }
        return true;
    }, EnumWindowsProc);

    EnumWindows(callback, null);
    koffi.unregister(callback);
    return foundWin;
};

export const focusWindow = (titleRegex: string): boolean => {
    const win = getWindowByTitleRegex(titleRegex);
    if (win && win.hwnd) {
        SwitchToThisWindow(win.hwnd, true);
        SetForegroundWindow(win.hwnd);
        return true;
    }
    return false;
};

export const getWindowBounds = (titleRegex: string): { left: number, top: number, right: number, bottom: number } | null => {
    const win = getWindowByTitleRegex(titleRegex);
    if (win && win.hwnd) {
        const rect = {};
        const success = GetWindowRect(win.hwnd, rect);
        if (success) {
            return rect as any;
        }
    }
    return null;
};
