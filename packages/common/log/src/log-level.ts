
export type LogLevel =
| 'debug'
| 'info'
| 'warn'
| 'error'

export function logLevelIndex(level: LogLevel): number {
  switch (level) {
    case 'debug':
      return 0;
    case 'info':
      return 1;
    case 'warn':
      return 2;
    case 'error':
      return 3;
    default:
      return 0;
  }
}
