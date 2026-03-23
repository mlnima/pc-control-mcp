import { spawn, type ChildProcess } from 'node:child_process';

interface SessionIndicator {
    show: () => void;
    hide: () => void;
    dispose: () => void;
    isVisible: () => boolean;
}

const createNoopIndicator = (): SessionIndicator => {
    const show = (): void => undefined;
    const hide = (): void => undefined;
    const dispose = (): void => undefined;
    const isVisible = (): boolean => false;
    return { show, hide, dispose, isVisible };
};

const buildWindowsOverlayScript = (): string => `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$form = New-Object System.Windows.Forms.Form
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
$form.TopMost = $true
$form.ShowInTaskbar = $false
$form.BackColor = [System.Drawing.Color]::FromArgb(15, 15, 15)
$form.Opacity = 0.86
$form.Width = 290
$form.Height = 44
$wa = [System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea
$form.Location = New-Object System.Drawing.Point(($wa.Right - $form.Width - 14), 10)
$label = New-Object System.Windows.Forms.Label
$label.AutoSize = $true
$label.Text = 'Remote control active'
$label.ForeColor = [System.Drawing.Color]::FromArgb(255, 255, 255)
$label.BackColor = [System.Drawing.Color]::Transparent
$label.Font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold)
$label.Location = New-Object System.Drawing.Point(14, 12)
$form.Controls.Add($label)
[System.Windows.Forms.Application]::Run($form)
`;

const createWindowsIndicator = (): SessionIndicator => {
    let overlayProcess: ChildProcess | null = null;

    const isVisible = (): boolean => {
        if (!overlayProcess) return false;
        return overlayProcess.exitCode === null && overlayProcess.killed === false;
    };

    const show = (): void => {
        if (isVisible()) return;
        const script = buildWindowsOverlayScript();
        const encodedScript = Buffer.from(script, 'utf16le').toString('base64');

        const processRef = spawn(
            'powershell',
            ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-EncodedCommand', encodedScript],
            { windowsHide: true, detached: true, stdio: 'ignore' }
        );

        overlayProcess = processRef;
        processRef.on('exit', () => {
            overlayProcess = null;
        });
        processRef.unref();
    };

    const hide = (): void => {
        if (!overlayProcess) return;
        overlayProcess.kill();
        overlayProcess = null;
    };

    const dispose = (): void => {
        hide();
    };

    return { show, hide, dispose, isVisible };
};

export const createSessionIndicator = (): SessionIndicator => {
    if (process.platform === 'win32') {
        return createWindowsIndicator();
    }
    return createNoopIndicator();
};
