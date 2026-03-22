#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema, isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { DesktopController } from './core/desktop-controller.js';
import { WindowsDesktopAdapter } from './platform/windows/adapter.js';
import type { EmergencyStopKey, HumanMouseOptions, MouseButton } from './core/types.js';

type StepAction =
    | 'move_mouse'
    | 'click'
    | 'mouse_down'
    | 'mouse_up'
    | 'drag_move'
    | 'scroll'
    | 'key_press'
    | 'type_text';

interface SessionState {
    id: string;
    createdAt: string;
    currentObservationId: string;
    dragButton: MouseButton | null;
    artifactDir: string;
}

interface MoveTarget {
    mode: 'delta' | 'absolute';
    dx?: number;
    dy?: number;
    x?: number;
    y?: number;
}

interface RuntimeContext {
    server: Server;
    controller: DesktopController;
    sessions: Map<string, SessionState>;
}

const TOOL_DEFS = [
    { name: 'server_info', description: 'Get server information', inputSchema: { type: 'object', properties: {} } },
    { name: 'screen_get_monitors', description: 'Get connected monitors', inputSchema: { type: 'object', properties: {} } },

    { name: 'session_start', description: 'Start a real-time control session and return an initial observation', inputSchema: { type: 'object', properties: { includeScreenshot: { type: 'boolean' }, monitorId: { type: 'string' } } } },
    { name: 'session_observe', description: 'Get latest screen state and new observation token', inputSchema: { type: 'object', properties: { sessionId: { type: 'string' }, includeScreenshot: { type: 'boolean' }, monitorId: { type: 'string' } }, required: ['sessionId'] } },
    { name: 'session_step', description: 'Execute exactly one mouse/keyboard action using the current observation token; returns a new observation', inputSchema: { type: 'object', properties: { sessionId: { type: 'string' }, observationId: { type: 'string' }, action: { type: 'string', enum: ['move_mouse', 'click', 'mouse_down', 'mouse_up', 'drag_move', 'scroll', 'key_press', 'type_text'] }, button: { type: 'string', enum: ['left', 'right', 'middle'] }, mode: { type: 'string', enum: ['delta', 'absolute'] }, dx: { type: 'number' }, dy: { type: 'number' }, x: { type: 'number' }, y: { type: 'number' }, durationMs: { type: 'number' }, jitter: { type: 'number' }, stepMsMin: { type: 'number' }, stepMsMax: { type: 'number' }, preDelayMs: { type: 'number' }, postDelayMs: { type: 'number' }, delta: { type: 'number' }, key: { type: 'number' }, text: { type: 'string' }, includeScreenshot: { type: 'boolean' }, monitorId: { type: 'string' } }, required: ['sessionId', 'observationId', 'action'] } },
    { name: 'session_end', description: 'End a session', inputSchema: { type: 'object', properties: { sessionId: { type: 'string' } }, required: ['sessionId'] } },

    { name: 'safety_set_emergency_key', description: 'Set emergency stop key (esc only)', inputSchema: { type: 'object', properties: { key: { type: 'string', enum: ['esc'] } }, required: ['key'] } },
    { name: 'safety_get_emergency_key', description: 'Get emergency stop key', inputSchema: { type: 'object', properties: {} } }
] as const;

const asString = (value: unknown, field: string): string => {
    if (typeof value !== 'string') throw new Error(`Invalid string for ${field}`);
    return value;
};

const asNumber = (value: unknown, field: string): number => {
    if (typeof value !== 'number' || Number.isNaN(value)) throw new Error(`Invalid number for ${field}`);
    return value;
};

const asMouseButton = (value: unknown): MouseButton => {
    if (value === 'left' || value === 'right' || value === 'middle') return value;
    throw new Error('button must be one of: left, right, middle');
};

const asEmergencyKey = (value: unknown): EmergencyStopKey => {
    if (value === 'esc') return value;
    throw new Error('key must be "esc"');
};

const asBoolean = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback);

const humanOptionsFromArgs = (args: Record<string, unknown>): HumanMouseOptions => {
    const options: HumanMouseOptions = {};
    if (typeof args.durationMs === 'number') options.durationMs = args.durationMs;
    if (typeof args.jitter === 'number') options.jitter = args.jitter;
    if (typeof args.stepMsMin === 'number') options.stepMsMin = args.stepMsMin;
    if (typeof args.stepMsMax === 'number') options.stepMsMax = args.stepMsMax;
    return options;
};

const getSession = (sessions: Map<string, SessionState>, sessionId: string): SessionState => {
    const session = sessions.get(sessionId);
    if (!session) throw new Error(`Unknown sessionId: ${sessionId}`);
    return session;
};

const resolveMoveTarget = (args: Record<string, unknown>): MoveTarget => {
    const mode = typeof args.mode === 'string' ? args.mode : 'delta';

    if (mode === 'delta') {
        return {
            mode: 'delta',
            dx: asNumber(args.dx, 'dx'),
            dy: asNumber(args.dy, 'dy')
        };
    }

    if (mode === 'absolute') {
        return {
            mode: 'absolute',
            x: asNumber(args.x, 'x'),
            y: asNumber(args.y, 'y')
        };
    }

    throw new Error('mode must be one of: delta, absolute');
};

const buildObservation = async (controller: DesktopController, session: SessionState, includeScreenshot: boolean, monitorId?: string) => {
    const observationId = randomUUID();
    session.currentObservationId = observationId;

    const cursor = controller.getCursorPos();
    const screenshotBase64 = includeScreenshot ? await controller.takeScreenshot(monitorId) : null;
    let screenshotPath: string | null = null;

    if (screenshotBase64) {
        await fs.mkdir(session.artifactDir, { recursive: true });
        screenshotPath = path.join(session.artifactDir, `obs-${Date.now()}-${observationId}.png`);
        await fs.writeFile(screenshotPath, Buffer.from(screenshotBase64, 'base64'));
    }

    return {
        observationId,
        timestamp: new Date().toISOString(),
        sessionId: session.id,
        cursor,
        emergencyStopKey: controller.getEmergencyStopKey(),
        screenshotBase64,
        screenshotPath
    };
};

const resolveScreenshotBaseDir = (): string => {
    const envDir = process.env.MCP_SCREENSHOT_DIR;
    if (envDir && envDir.trim().length > 0) {
        return envDir;
    }

    const picturesDir = path.join(os.homedir(), 'Pictures');
    return path.join(picturesDir, 'pc-control-mcp');
};

const clearScreenshotWorkspace = async (baseDir: string): Promise<void> => {
    await fs.rm(baseDir, { recursive: true, force: true });
    await fs.mkdir(baseDir, { recursive: true });
};

const createRuntime = (): RuntimeContext => {
    const controller = new DesktopController(new WindowsDesktopAdapter());
    const sessions = new Map<string, SessionState>();
    const screenshotBaseDir = resolveScreenshotBaseDir();

    const server = new Server(
        { name: 'pc-control-mcp', version: '3.1.0' },
        { capabilities: { tools: {} } }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...TOOL_DEFS] }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: rawArgs } = request.params;
        const args = (rawArgs ?? {}) as Record<string, unknown>;

        try {
            let result: unknown;

            switch (name) {
                case 'server_info':
                    result = {
                        server: 'pc-control-mcp',
                        version: '3.1.0',
                        mode: 'realtime-session-step',
                        controls: ['mouse', 'keyboard', 'screenshot'],
                        platformAdapter: controller.platform,
                        emergencyStopKey: controller.getEmergencyStopKey(),
                        activeSessions: sessions.size,
                        pid: process.pid,
                        node: process.version
                    };
                    break;

                case 'screen_get_monitors':
                    result = await controller.getMonitors();
                    break;

                case 'session_start': {
                    if (sessions.size === 0) {
                        await clearScreenshotWorkspace(screenshotBaseDir);
                    }

                    const session: SessionState = {
                        id: randomUUID(),
                        createdAt: new Date().toISOString(),
                        currentObservationId: randomUUID(),
                        dragButton: null,
                        artifactDir: path.join(screenshotBaseDir, `session-${Date.now()}-${randomUUID()}`)
                    };

                    sessions.set(session.id, session);

                    result = {
                        session: {
                            id: session.id,
                            createdAt: session.createdAt
                        },
                        observation: await buildObservation(
                            controller,
                            session,
                            asBoolean(args.includeScreenshot, true),
                            typeof args.monitorId === 'string' ? args.monitorId : undefined
                        )
                    };
                    break;
                }

                case 'session_observe': {
                    const session = getSession(sessions, asString(args.sessionId, 'sessionId'));
                    result = await buildObservation(
                        controller,
                        session,
                        asBoolean(args.includeScreenshot, true),
                        typeof args.monitorId === 'string' ? args.monitorId : undefined
                    );
                    break;
                }

                case 'session_step': {
                    const session = getSession(sessions, asString(args.sessionId, 'sessionId'));
                    const observationId = asString(args.observationId, 'observationId');
                    const action = asString(args.action, 'action') as StepAction;

                    if (observationId !== session.currentObservationId) {
                        throw new Error('Observation token is stale. Call session_observe and use the latest observationId.');
                    }

                    let actionResult: unknown = 'ok';

                    switch (action) {
                        case 'move_mouse': {
                            const target = resolveMoveTarget(args);
                            if (target.mode === 'delta') {
                                actionResult = await controller.mouseMoveHuman(target.dx as number, target.dy as number, humanOptionsFromArgs(args));
                            } else {
                                actionResult = await controller.mouseMoveHumanToAbsolute(target.x as number, target.y as number, humanOptionsFromArgs(args));
                            }
                            break;
                        }
                        case 'click':
                            await controller.mouseClickHuman(
                                asMouseButton(args.button),
                                typeof args.preDelayMs === 'number' ? args.preDelayMs : 40,
                                typeof args.postDelayMs === 'number' ? args.postDelayMs : 65
                            );
                            actionResult = 'clicked';
                            break;
                        case 'mouse_down': {
                            const button = asMouseButton(args.button);
                            controller.mouseDown(button);
                            session.dragButton = button;
                            actionResult = 'mouse down';
                            break;
                        }
                        case 'mouse_up':
                            controller.mouseUp(asMouseButton(args.button));
                            session.dragButton = null;
                            actionResult = 'mouse up';
                            break;
                        case 'drag_move': {
                            if (!session.dragButton) {
                                throw new Error('No drag in progress. Call mouse_down first.');
                            }
                            const target = resolveMoveTarget(args);
                            if (target.mode === 'delta') {
                                actionResult = await controller.mouseMoveHuman(target.dx as number, target.dy as number, humanOptionsFromArgs(args));
                            } else {
                                actionResult = await controller.mouseMoveHumanToAbsolute(target.x as number, target.y as number, humanOptionsFromArgs(args));
                            }
                            break;
                        }
                        case 'scroll':
                            controller.mouseScroll(asNumber(args.delta, 'delta'));
                            actionResult = 'scrolled';
                            break;
                        case 'key_press':
                            controller.keyPressScan(asNumber(args.key, 'key'));
                            actionResult = 'pressed';
                            break;
                        case 'type_text':
                            controller.typeText(asString(args.text, 'text'));
                            actionResult = 'typed';
                            break;
                        default:
                            throw new Error(`Unsupported action: ${action}`);
                    }

                    result = {
                        action,
                        actionResult,
                        observation: await buildObservation(
                            controller,
                            session,
                            asBoolean(args.includeScreenshot, true),
                            typeof args.monitorId === 'string' ? args.monitorId : undefined
                        )
                    };
                    break;
                }

                case 'session_end': {
                    const session = getSession(sessions, asString(args.sessionId, 'sessionId'));
                    if (session.dragButton) {
                        controller.mouseUp(session.dragButton);
                    }
                    sessions.delete(session.id);
                    result = { sessionId: session.id, ended: true };
                    break;
                }

                case 'safety_set_emergency_key':
                    result = { emergencyStopKey: controller.setEmergencyStopKey(asEmergencyKey(args.key)) };
                    break;
                case 'safety_get_emergency_key':
                    result = { emergencyStopKey: controller.getEmergencyStopKey() };
                    break;

                default:
                    throw new Error(`Unknown tool: ${name}`);
            }

            return { content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }] };
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            return { content: [{ type: 'text', text: `Error: ${errorMessage}` }], isError: true };
        }
    });

    return { server, controller, sessions };
};

const getHeaderValue = (req: IncomingMessage, name: string): string | undefined => {
    const raw = req.headers[name.toLowerCase()];
    if (Array.isArray(raw)) return raw[0];
    return raw;
};

const parseJsonBody = async (req: IncomingMessage): Promise<unknown> => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    if (chunks.length === 0) return undefined;
    const text = Buffer.concat(chunks).toString('utf-8').trim();
    if (!text) return undefined;
    return JSON.parse(text);
};

const applyCors = (res: ServerResponse): void => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'content-type, mcp-session-id, authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
};

const isAuthorized = (req: IncomingMessage, token?: string): boolean => {
    if (!token) return true;
    const auth = getHeaderValue(req, 'authorization');
    return auth === `Bearer ${token}`;
};

const startHttpMode = async (): Promise<void> => {
    const host = process.env.MCP_HTTP_HOST ?? '0.0.0.0';
    const port = Number(process.env.MCP_HTTP_PORT ?? '3333');
    const authToken = process.env.MCP_AUTH_TOKEN;

    const transports = new Map<string, StreamableHTTPServerTransport>();

    const httpServer = createServer(async (req, res) => {
        try {
            applyCors(res);

            if (req.method === 'OPTIONS') {
                res.writeHead(204).end();
                return;
            }

            if (req.url === '/health') {
                res.setHeader('content-type', 'application/json');
                res.writeHead(200).end(JSON.stringify({ ok: true, transport: 'http', version: '3.1.0' }));
                return;
            }

            if (req.url !== '/mcp') {
                res.writeHead(404).end('Not Found');
                return;
            }

            if (!isAuthorized(req, authToken)) {
                res.writeHead(401).end('Unauthorized');
                return;
            }

            const sessionId = getHeaderValue(req, 'mcp-session-id');

            if (req.method === 'GET') {
                if (!sessionId || !transports.has(sessionId)) {
                    res.writeHead(400).end('Invalid or missing session ID');
                    return;
                }

                await transports.get(sessionId)!.handleRequest(req, res);
                return;
            }

            if (req.method !== 'POST') {
                res.writeHead(405).end('Method Not Allowed');
                return;
            }

            const body = await parseJsonBody(req);

            if (sessionId && transports.has(sessionId)) {
                await transports.get(sessionId)!.handleRequest(req, res, body);
                return;
            }

            if (!sessionId && isInitializeRequest(body)) {
                const runtime = createRuntime();

                let transport: StreamableHTTPServerTransport;
                transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: () => randomUUID(),
                    onsessioninitialized: (sid) => {
                        transports.set(sid, transport);
                    }
                });

                transport.onclose = () => {
                    if (transport.sessionId) transports.delete(transport.sessionId);
                };

                await runtime.server.connect(transport);
                await transport.handleRequest(req, res, body);
                return;
            }

            res.writeHead(400).end('Bad Request: invalid session or initialize payload');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            if (!res.headersSent) {
                res.writeHead(500).end(`Internal Server Error: ${message}`);
            }
        }
    });

    httpServer.listen(port, host, () => {
        const authEnabled = Boolean(authToken);
        console.log(`pc-control-mcp HTTP listening on http://${host}:${port}/mcp`);
        console.log(`Health: http://${host}:${port}/health`);
        console.log(`Auth token required: ${authEnabled}`);
    });

    process.on('SIGINT', async () => {
        for (const transport of transports.values()) {
            await transport.close();
        }
        httpServer.close(() => process.exit(0));
    });
};

const startStdioMode = async (): Promise<void> => {
    const runtime = createRuntime();
    const transport = new StdioServerTransport();
    await runtime.server.connect(transport);
};

const main = async (): Promise<void> => {
    const mode = (process.env.MCP_TRANSPORT ?? 'stdio').toLowerCase();

    if (mode === 'http') {
        await startHttpMode();
        return;
    }

    await startStdioMode();
};

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
