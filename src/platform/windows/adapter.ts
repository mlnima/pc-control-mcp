import type { DesktopAdapter, EmergencyStopKey, MouseButton } from '../../core/types.js';
import * as processApi from '../../process.js';
import * as windowApi from '../../window.js';
import * as inputApi from '../../input.js';
import * as systemApi from '../../system.js';
import * as cmdApi from '../../cmd.js';

export class WindowsDesktopAdapter implements DesktopAdapter {
    readonly platform = 'windows';

    launchProcess(command: string, args?: string[], cwd?: string): number | undefined {
        return processApi.launchProcess(command, args, cwd);
    }

    listProcesses() {
        return processApi.listProcesses();
    }

    killProcess(pid: number): boolean {
        return processApi.killProcess(pid);
    }

    listWindows() {
        return windowApi.listWindows();
    }

    findWindow(titleRegex: string) {
        return windowApi.getWindowByTitleRegex(titleRegex);
    }

    focusWindow(titleRegex: string) {
        return windowApi.focusWindow(titleRegex);
    }

    getWindowBounds(titleRegex: string) {
        return windowApi.getWindowBounds(titleRegex);
    }

    getForegroundWindow() {
        return windowApi.getForegroundWindow();
    }

    mouseMoveDelta(dx: number, dy: number): void {
        inputApi.mouseMoveDelta(dx, dy);
    }

    mouseMoveAbsolute(x: number, y: number): void {
        inputApi.mouseMoveAbsolute(x, y);
    }

    mouseDown(button: MouseButton): void {
        inputApi.mouseDown(button);
    }

    mouseUp(button: MouseButton): void {
        inputApi.mouseUp(button);
    }

    mouseClick(button: MouseButton): void {
        inputApi.click(button);
    }

    mouseScroll(delta: number): void {
        inputApi.scroll(delta);
    }

    keyPressScan(key: number): void {
        inputApi.keyPressScan(key);
    }

    typeText(text: string): void {
        inputApi.typeText(text);
    }

    getCursorPos() {
        return systemApi.getCursorPos();
    }

    isEmergencyStopPressed(key: EmergencyStopKey): boolean {
        if (key === 'esc') {
            return inputApi.isEscapePressed();
        }

        return false;
    }

    takeScreenshot(monitorId?: string): Promise<string> {
        return systemApi.takeScreenshot(monitorId);
    }

    getMonitors() {
        return systemApi.getMonitors();
    }

    getClipboard(): Promise<string> {
        return systemApi.getClipboard();
    }

    setClipboard(text: string): Promise<void> {
        return systemApi.setClipboard(text);
    }

    fileExists(path: string): Promise<boolean> {
        return systemApi.fileExists(path);
    }

    readFile(path: string): Promise<string> {
        return systemApi.readFile(path);
    }

    writeFile(path: string, data: string): Promise<void> {
        return systemApi.writeFile(path, data);
    }

    listDir(path: string): Promise<Array<{ name: string; isDirectory: boolean }>> {
        return systemApi.listDir(path);
    }

    runCmd(command: string, requireConfirmation?: boolean): Promise<string> {
        return cmdApi.runCmd(command, requireConfirmation);
    }
}
