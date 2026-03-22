#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import * as input from './input.js';
import * as win from './window.js';
import * as proc from './process.js';
import * as sys from './system.js';
import * as cmd from './cmd.js';

const server = new Server(
    { name: 'pc-control-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        { name: 'process_launch', description: 'Launch a process', inputSchema: { type: 'object', properties: { command: { type: 'string' }, args: { type: 'array', items: { type: 'string' } }, cwd: { type: 'string' } }, required: ['command'] } },
        { name: 'process_list', description: 'List running processes', inputSchema: { type: 'object', properties: {} } },
        { name: 'process_kill', description: 'Kill a process by PID', inputSchema: { type: 'object', properties: { pid: { type: 'number' } }, required: ['pid'] } },

        { name: 'window_list', description: 'List visible windows', inputSchema: { type: 'object', properties: {} } },
        { name: 'window_find', description: 'Find a window by title regex', inputSchema: { type: 'object', properties: { titleRegex: { type: 'string' } }, required: ['titleRegex'] } },
        { name: 'window_focus', description: 'Focus a window', inputSchema: { type: 'object', properties: { titleRegex: { type: 'string' } }, required: ['titleRegex'] } },
        { name: 'window_bounds', description: 'Get bounds of a window', inputSchema: { type: 'object', properties: { titleRegex: { type: 'string' } }, required: ['titleRegex'] } },

        { name: 'input_mouse_move_delta', description: 'Raw mouse delta movement', inputSchema: { type: 'object', properties: { dx: { type: 'number' }, dy: { type: 'number' } }, required: ['dx', 'dy'] } },
        { name: 'input_click', description: 'Click mouse button', inputSchema: { type: 'object', properties: { button: { type: 'string', enum: ['left', 'right', 'middle'] } }, required: ['button'] } },
        { name: 'input_drag', description: 'Drag mouse', inputSchema: { type: 'object', properties: { dx: { type: 'number' }, dy: { type: 'number' }, button: { type: 'string', enum: ['left', 'right', 'middle'] } }, required: ['dx', 'dy', 'button'] } },
        { name: 'input_scroll', description: 'Scroll mouse', inputSchema: { type: 'object', properties: { delta: { type: 'number' } }, required: ['delta'] } },
        { name: 'input_key_press_scan', description: 'Press key by Virtual Key code using hardware Scan Code', inputSchema: { type: 'object', properties: { key: { type: 'number' } }, required: ['key'] } },
        { name: 'input_type_text', description: 'Type unicode text', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },

        { name: 'screen_screenshot', description: 'Take a screenshot', inputSchema: { type: 'object', properties: { monitorId: { type: 'string' } } } },
        { name: 'screen_get_monitors', description: 'Get connected monitors', inputSchema: { type: 'object', properties: {} } },
        { name: 'screen_get_cursor_pos', description: 'Get mouse cursor position', inputSchema: { type: 'object', properties: {} } },

        { name: 'clipboard_get', description: 'Get clipboard text', inputSchema: { type: 'object', properties: {} } },
        { name: 'clipboard_set', description: 'Set clipboard text', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } },

        { name: 'fs_exists', description: 'Check file exist', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
        { name: 'fs_read', description: 'Read file', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
        { name: 'fs_write', description: 'Write file', inputSchema: { type: 'object', properties: { path: { type: 'string' }, data: { type: 'string' } }, required: ['path', 'data'] } },
        { name: 'fs_list', description: 'List directory', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },

        { name: 'cmd_run', description: 'Run secure shell command', inputSchema: { type: 'object', properties: { command: { type: 'string' }, requireConfirmation: { type: 'boolean' } }, required: ['command'] } }
    ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        let result: any;
        switch (name) {
            case 'process_launch': result = proc.launchProcess(args?.command as string, args?.args as string[], args?.cwd as string); break;
            case 'process_list': result = await proc.listProcesses(); break;
            case 'process_kill': result = proc.killProcess(args?.pid as number); break;

            case 'window_list': result = await win.listWindows(); break;
            case 'window_find': result = await win.getWindowByTitleRegex(args?.titleRegex as string); break;
            case 'window_focus': result = await win.focusWindow(args?.titleRegex as string); break;
            case 'window_bounds': result = await win.getWindowBounds(args?.titleRegex as string); break;

            case 'input_mouse_move_delta': input.mouseMoveDelta(args?.dx as number, args?.dy as number); result = 'Moved'; break;
            case 'input_click': input.click(args?.button as any); result = 'Clicked'; break;
            case 'input_drag': input.drag(args?.dx as number, args?.dy as number, args?.button as any); result = 'Dragged'; break;
            case 'input_scroll': input.scroll(args?.delta as number); result = 'Scrolled'; break;
            case 'input_key_press_scan': input.keyPressScan(args?.key as number); result = 'Pressed'; break;
            case 'input_type_text': input.typeText(args?.text as string); result = 'Typed'; break;

            case 'screen_screenshot': result = await sys.takeScreenshot(args?.monitorId as string); break;
            case 'screen_get_monitors': result = await sys.getMonitors(); break;
            case 'screen_get_cursor_pos': result = sys.getCursorPos(); break;

            case 'clipboard_get': result = await sys.getClipboard(); break;
            case 'clipboard_set': await sys.setClipboard(args?.text as string); result = 'Clipboard set'; break;

            case 'fs_exists': result = await sys.fileExists(args?.path as string); break;
            case 'fs_read': result = await sys.readFile(args?.path as string); break;
            case 'fs_write': await sys.writeFile(args?.path as string, args?.data as string); result = 'File written'; break;
            case 'fs_list': result = await sys.listDir(args?.path as string); break;

            case 'cmd_run': result = await cmd.runCmd(args?.command as string, args?.requireConfirmation as boolean); break;

            default: throw new Error(`Unknown tool: ${name}`);
        }

        return {
            content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }]
        };
    } catch (e: any) {
        return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
    }
});

const transport = new StdioServerTransport();
server.connect(transport).catch(console.error);
