//
// Copyright 2025 DXOS.org
//

const colors = ['#00ffaa', '#00aaff', '#ffaa00', '#ff00aa', '#aa00ff'];

export const theme = {
  accent: colors[Math.floor(Math.random() * colors.length)],
  bg: '#000000',
  input: {
    bg: '#1f1f1f',
  },
  text: {
    bold: '#ffffff',
    default: '#cdcdcd',
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
