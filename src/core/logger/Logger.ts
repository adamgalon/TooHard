export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Port: anything that can record diagnostics. */
export interface Logger {
  log(level: LogLevel, message: string, context?: Record<string, unknown>): void;
}

export class ConsoleLogger implements Logger {
  constructor(private readonly minimumLevel: LogLevel = __DEV__ ? 'debug' : 'warn') {}

  private static readonly weight: Record<LogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
  };

  log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (ConsoleLogger.weight[level] < ConsoleLogger.weight[this.minimumLevel]) return;
    const prefix = `[${level.toUpperCase()}]`;
    if (context) console[level === 'debug' ? 'log' : level](prefix, message, context);
    else console[level === 'debug' ? 'log' : level](prefix, message);
  }
}

export class SilentLogger implements Logger {
  log(): void {
    /* no-op, used in tests */
  }
}
