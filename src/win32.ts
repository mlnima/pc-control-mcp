import koffi from 'koffi';

const user32 = koffi.load('user32.dll');

// Structs
export const MOUSEINPUT = koffi.struct('MOUSEINPUT', {
    dx: 'int32',
    dy: 'int32',
    mouseData: 'uint32',
    dwFlags: 'uint32',
    time: 'uint32',
    dwExtraInfo: 'uint64'
});

export const KEYBDINPUT = koffi.struct('KEYBDINPUT', {
    wVk: 'uint16',
    wScan: 'uint16',
    dwFlags: 'uint32',
    time: 'uint32',
    dwExtraInfo: 'uint64'
});

export const HARDWAREINPUT = koffi.struct('HARDWAREINPUT', {
    uMsg: 'uint32',
    wParamL: 'uint16',
    wParamH: 'uint16'
});

export const InputUnion = koffi.union('InputUnion', {
    mi: MOUSEINPUT,
    ki: KEYBDINPUT,
    hi: HARDWAREINPUT
});

export const INPUT = koffi.struct('INPUT', {
    type: 'uint32',
    u: InputUnion
});

export const POINT = koffi.struct('POINT', {
    x: 'int32',
    y: 'int32'
});

export const RECT = koffi.struct('RECT', {
    left: 'int32',
    top: 'int32',
    right: 'int32',
    bottom: 'int32'
});

// Constants
export const INPUT_MOUSE = 0;
export const INPUT_KEYBOARD = 1;
export const INPUT_HARDWARE = 2;

export const MOUSEEVENTF_MOVE = 0x0001;
export const MOUSEEVENTF_LEFTDOWN = 0x0002;
export const MOUSEEVENTF_LEFTUP = 0x0004;
export const MOUSEEVENTF_RIGHTDOWN = 0x0008;
export const MOUSEEVENTF_RIGHTUP = 0x0010;
export const MOUSEEVENTF_MIDDLEDOWN = 0x0020;
export const MOUSEEVENTF_MIDDLEUP = 0x0040;
export const MOUSEEVENTF_WHEEL = 0x0800;

export const KEYEVENTF_KEYUP = 0x0002;
export const KEYEVENTF_SCANCODE = 0x0008;

export const MAPVK_VK_TO_VSC = 0;

export const VK_ESCAPE = 0x1B;

// Functions
export const SendInput = user32.func('uint32 SendInput(uint32 cInputs, INPUT *pInputs, int32 cbSize)');
export const MapVirtualKeyExW = user32.func('uint32 MapVirtualKeyExW(uint32 uCode, uint32 uMapType, void *dwhkl)');

export const GetCursorPos = user32.func('bool GetCursorPos(_Out_ POINT *lpPoint)');
export const SetCursorPos = user32.func('bool SetCursorPos(int32 X, int32 Y)');
export const GetAsyncKeyState = user32.func('int16 GetAsyncKeyState(int32 vKey)');
