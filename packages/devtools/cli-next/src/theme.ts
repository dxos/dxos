//
// Copyright 2025 DXOS.org
//

const colors = ['#00ffaa', '#00aaff', '#ffaa00', '#ff00aa', '#aa00ff'];

export type Theme = {
  accent: string;
  bg: string;
  input: {
    bg: string;
  };
  text: {
    bold: string;
    default: string;
    subdued: string;
    primary: string;
    secondary: string;
  };
  log: {
    default: string;
    debug: string;
    info: string;
    warn: string;
    error: string;
  };
  role: (role: string) => string;
};

export const theme: Theme = {
  accent: colors[Math.floor(Math.random() * colors.length)],
  bg: '#000000',
  input: {
    bg: '#0D1116',
  },
  text: {
    bold: '#ffffff',
    default: '#c0c0c0',
    subdued: '#a0a0a0',
    primary: '#00ffaa',
    secondary: '#00aaff',
  },
  log: {
    default: '#757679',
    debug: '#757679',
    info: '#59C2C6',
    warn: '#C7C43F',
    error: '#D07E78',
  },
  role: (role: string) => {
    switch (role) {
      case 'user':
        return '#00ffff';
      case 'assistant':
        return '#00ff00';
      case 'error':
        return '#ff0000';
      default:
        return '#ffffff';
    }
  },
};

