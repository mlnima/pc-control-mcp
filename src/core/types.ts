export type MouseButton = 'left' | 'right' | 'middle';
export type EmergencyStopKey = 'esc';

export interface CursorPosition {
    x: number;
    y: number;
}

export interface WindowInfo {
    title: string;
    processId: number;
}

export interface WindowMatch extends WindowInfo {
    hwnd?: string;
}

export interface WindowBounds {
    left: number;
    top: number;
    right: number;
    bottom: number;
}

export interface ForegroundWindowInfo {
    title: string;
    processId: number;
    bounds: WindowBounds;
}

export interface ProcessInfo {
    name: string;
    pid: number;
    session?: string;
    memory?: string;
}

export interface HumanMouseOptions {
    durationMs?: number;
    stepMsMin?: number;
    stepMsMax?: number;
    jitter?: number;
}

export interface InputGuardPadding {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
}

export interface InputGuardState {
    titleRegex: string;
    bounds: WindowBounds;
    padding: Required<InputGuardPadding>;
}

export interface DesktopAdapter {
    readonly platform: string;

    launchProcess(command: string, args?: string[], cwd?: string): number | undefined;
    listProcesses(): Promise<ProcessInfo[]>;
    killProcess(pid: number): boolean;

    listWindows(): Promise<WindowInfo[]>;
    findWindow(titleRegex: string): Promise<WindowMatch | null>;
    focusWindow(titleRegex: string): Promise<boolean>;
    getWindowBounds(titleRegex: string): Promise<WindowBounds | null>;
    getForegroundWindow(): Promise<ForegroundWindowInfo | null>;

    mouseMoveDelta(dx: number, dy: number): void;
    mouseMoveAbsolute(x: number, y: number): void;
    mouseDown(button: MouseButton): void;
    mouseUp(button: MouseButton): void;
    mouseClick(button: MouseButton): void;
    mouseScroll(delta: number): void;
    keyPressScan(key: number): void;
    typeText(text: string): void;
    getCursorPos(): CursorPosition | null;
    isEmergencyStopPressed(key: EmergencyStopKey): boolean;

    takeScreenshot(monitorId?: string): Promise<string>;
    getMonitors(): Promise<unknown>;

    getClipboard(): Promise<string>;
    setClipboard(text: string): Promise<void>;

    fileExists(path: string): Promise<boolean>;
    readFile(path: string): Promise<string>;
    writeFile(path: string, data: string): Promise<void>;
    listDir(path: string): Promise<Array<{ name: string; isDirectory: boolean }>>;

    runCmd(command: string, requireConfirmation?: boolean): Promise<string>;
}
