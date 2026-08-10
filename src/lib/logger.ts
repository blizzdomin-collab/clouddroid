import crypto from 'crypto';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  requestId: string;
  message: string;
  data?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLogLevel: LogLevel = 'info';

export function setLogLevel(level: LogLevel) {
  currentLogLevel = level;
}

export function generateRequestId(): string {
  return crypto.randomBytes(8).toString('hex');
}

export function log(level: LogLevel, requestId: string, message: string, data?: Record<string, unknown>) {
  if (LOG_LEVELS[level] < LOG_LEVELS[currentLogLevel]) {
    return;
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    requestId,
    message,
    data,
  };

  const logLine = JSON.stringify(entry);

  switch (level) {
    case 'debug':
      console.debug(logLine);
      break;
    case 'info':
      console.info(logLine);
      break;
    case 'warn':
      console.warn(logLine);
      break;
    case 'error':
      console.error(logLine);
      break;
  }
}

export function debug(requestId: string, message: string, data?: Record<string, unknown>) {
  log('debug', requestId, message, data);
}

export function info(requestId: string, message: string, data?: Record<string, unknown>) {
  log('info', requestId, message, data);
}

export function warn(requestId: string, message: string, data?: Record<string, unknown>) {
  log('warn', requestId, message, data);
}

export function error(requestId: string, message: string, data?: Record<string, unknown>) {
  log('error', requestId, message, data);
}
