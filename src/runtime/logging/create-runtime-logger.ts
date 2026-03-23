type LogFields = Record<string, unknown>;

const writeLog = (level: 'INFO' | 'WARN' | 'ERROR', event: string, fields: LogFields): void => {
    const payload = {
        ts: new Date().toISOString(),
        level,
        event,
        ...fields
    };
    console.log(JSON.stringify(payload));
};

export const createRuntimeLogger = () => {
    const info = (event: string, fields: LogFields = {}): void => writeLog('INFO', event, fields);
    const warn = (event: string, fields: LogFields = {}): void => writeLog('WARN', event, fields);
    const error = (event: string, fields: LogFields = {}): void => writeLog('ERROR', event, fields);

    return { info, warn, error };
};
