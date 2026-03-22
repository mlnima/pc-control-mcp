declare module 'screenshot-desktop' {
    interface ScreenshotOptions {
        filename?: string;
        format?: string;
        screen?: string;
    }

    interface Display {
        id: string;
        name: string;
        left: number;
        top: number;
        right: number;
        bottom: number;
        width: number;
        height: number;
    }

    function screenshot(options?: ScreenshotOptions): Promise<Buffer>;
    namespace screenshot {
        function listDisplays(): Promise<Display[]>;
        function availableDisplays(): Promise<Display[]>;
    }

    export = screenshot;
}
