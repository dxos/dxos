//
// Copyright 2022 DXOS.org
//

// TODO(burdon): Enum?
export type LogLevel =
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'

export const logLevelIndex = (level: LogLevel): number => {
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
};
