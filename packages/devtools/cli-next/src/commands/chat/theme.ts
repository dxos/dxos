//
// Copyright 2025 DXOS.org
//

const colors = ['#00ffaa', '#00aaff', '#ffaa00', '#ff00aa', '#aa00ff'];

export const theme = {
  accent: colors[Math.floor(Math.random() * colors.length)],
  bg: '#000000',
  input: {
    bg: '#1a1a1a',
  },
  text: {
    subdued: '#cdcdcd',
    primary: '#00ffff',
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
