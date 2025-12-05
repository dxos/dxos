//
// Copyright 2025 DXOS.org
//

/**
 * Color theme for the terminal UI.
 * Inspired by GitHub Dark theme and OpenCode CLI.
 */
export const theme = {
  colors: {
    // Primary colors
    primary: '#00D9FF', // Cyan - for highlights and links
    secondary: '#7B61FF', // Purple - for secondary actions
    success: '#00FF88', // Green - for success messages
    warning: '#FFD700', // Gold - for warnings
    error: '#FF5555', // Red - for errors
    info: '#58A6FF', // Blue - for info messages

    // Text colors
    text: '#E6EDF3', // Light gray - primary text
    textDim: '#8B949E', // Dim gray - secondary text
    textBright: '#FFFFFF', // White - emphasis

    // Background colors
    background: '#0D1117', // Dark background
    backgroundHover: '#161B22', // Hover state
    backgroundActive: '#21262D', // Active state

    // Border colors
    border: '#30363D', // Border gray
    borderFocus: '#58A6FF', // Focused border

    // Status colors
    statusIdle: '#8B949E',
    statusActive: '#00FF88',
    statusError: '#FF5555',
  },

  /**
   * ANSI escape codes for non-Ink usage.
   * Use these for raw terminal output.
   */
  ansi: {
    // Reset
    reset: '\x1b[0m',

    // Styles
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    italic: '\x1b[3m',
    underline: '\x1b[4m',

    // Foreground colors
    black: '\x1b[30m',
    red: '\x1b[91m',
    green: '\x1b[92m',
    yellow: '\x1b[93m',
    blue: '\x1b[94m',
    magenta: '\x1b[95m',
    cyan: '\x1b[96m',
    white: '\x1b[97m',
    gray: '\x1b[90m',

    // Background colors
    bgBlack: '\x1b[40m',
    bgRed: '\x1b[101m',
    bgGreen: '\x1b[102m',
    bgYellow: '\x1b[103m',
    bgBlue: '\x1b[104m',
    bgMagenta: '\x1b[105m',
    bgCyan: '\x1b[106m',
    bgWhite: '\x1b[107m',
  },

  /**
   * Semantic color mappings for different message types.
   */
  semantic: {
    user: '#00D9FF', // Cyan for user messages
    assistant: '#E6EDF3', // Light gray for assistant messages
    system: '#8B949E', // Dim gray for system messages
    code: '#7B61FF', // Purple for code blocks
    link: '#58A6FF', // Blue for links
  },
} as const;

/**
 * Helper function to format text with ANSI colors.
 */
export const colorize = {
  primary: (text: string) => `${theme.ansi.cyan}${text}${theme.ansi.reset}`,
  success: (text: string) => `${theme.ansi.green}${text}${theme.ansi.reset}`,
  error: (text: string) => `${theme.ansi.red}${text}${theme.ansi.reset}`,
  warning: (text: string) => `${theme.ansi.yellow}${text}${theme.ansi.reset}`,
  info: (text: string) => `${theme.ansi.blue}${text}${theme.ansi.reset}`,
  dim: (text: string) => `${theme.ansi.dim}${text}${theme.ansi.reset}`,
  bold: (text: string) => `${theme.ansi.bold}${text}${theme.ansi.reset}`,
};

export type Theme = typeof theme;
