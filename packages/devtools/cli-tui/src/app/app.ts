//
// Copyright 2025 DXOS.org
//

import blessed from 'blessed';

import { checkOllamaServer, streamOllamaResponse } from '../util';

/**
 * DXOS CLI TUI - Terminal User Interface.
 * Built with blessed for zero-flicker performance.
 */

// Suppress stderr to hide terminfo warnings; MUST be before importing blessed.
const originalStderrWrite = process.stderr.write.bind(process.stderr);

process.stderr.write = (chunk: any, ...args: any[]): boolean => {
  const str = chunk.toString();
  // Filter out blessed terminfo warnings.
  if (
    str.includes('Error on xterm') ||
    str.includes('Setulc') ||
    str.includes('var v,') ||
    str.includes('\\u001b[58::')
  ) {
    return true;
  }
  return originalStderrWrite(chunk, ...args);
};

// Create screen with smart CSR (cursor save/restore) - prevents flickering!
// @ts-ignore - blessed types are incomplete
const screen = blessed.screen({
  smartCSR: true,
  fullUnicode: true,
  title: 'DXOS CLI',
  warnings: false,
  // Try to prevent terminal shortcuts from affecting our screen.
  forceUnicode: true,
  resizeTimeout: 300,
});

// Message storage.
const messages: string[] = [];

// Track if we're currently streaming.
let isStreaming = false;

// Fixed header at top.
const header = blessed.box({
  top: 0,
  left: 0,
  width: '100%',
  height: 3,
  content: '{bold}{cyan-fg}DXOS CLI - Terminal UI{/}\n{gray-fg}Loading...{/}',
  tags: true,
  border: 'line' as any,
  style: {
    border: {
      fg: 'blue',
    },
  },
});

// Scrollable message box in middle.
const messageBox = blessed.box({
  top: 3,
  left: 0,
  right: 0,
  bottom: 5,
  scrollable: true,
  alwaysScroll: true,
  tags: true, // Enable tag rendering for colors.
  scrollbar: {
    ch: '█',
    style: {
      fg: 'yellow',
    },
  },
  keys: true,
  vi: true,
  mouse: true,
  border: 'line' as any,
  style: {
    border: {
      fg: 'gray',
    },
  },
});

// Show last N messages (scroll to bottom).
const updateMessages = () => {
  const content = messages.join('\n');
  messageBox.setContent(content);
  // Scroll to bottom - use large number to ensure we're at bottom
  messageBox.scrollTo(messages.length);
  screen.render();
};

// Throttled update for streaming (max 20 updates/sec).
let updateTimeout: NodeJS.Timeout | null = null;
const throttledUpdate = () => {
  if (updateTimeout) return;
  updateTimeout = setTimeout(() => {
    updateMessages();
    updateTimeout = null;
  }, 50);
};

// Fixed input box at bottom.
const inputBox = blessed.textarea({
  bottom: 0,
  left: 0,
  right: 0,
  height: 5,
  inputOnFocus: true,
  keys: true, // Enable key handling.
  mouse: true,
  border: 'line' as any,
  style: {
    border: {
      fg: 'green',
    },
    focus: {
      border: {
        fg: 'bright-green',
      },
    },
  },
  label: ' {green-fg}❯ Type here{/} ',
  tags: true,
});

// Handle Enter key to submit (textarea normally uses Enter for newlines).
inputBox.key(['enter'], function (this: any) {
  const value = this.getValue();
  const prompt = value.trim();
  if (!prompt || isStreaming) {
    return false;
  }

  // Trigger submit handler.
  this.emit('submit', value);
  return false;
});

// Allow Shift+Enter for multi-line input (insert newline).
inputBox.key(['S-enter'], function (this: any) {
  // Insert newline at cursor position
  this.insertText('\n');
  return false;
});

// Handle input submission.
inputBox.on('submit', async (value) => {
  const prompt = value.trim();
  if (!prompt || isStreaming) return;

  // Add user message.
  messages.push(`{cyan-fg}User:{/} ${prompt}`);
  updateMessages();

  // Clear input.
  inputBox.clearValue();
  inputBox.focus();

  // Start streaming assistant response.
  isStreaming = true;
  messages.push('{green-fg}Assistant:{/} ');
  const assistantMessageIndex = messages.length - 1;

  try {
    // TODO(burdon): Reuse our stack with conversation awareness (or use Effect).
    await streamOllamaResponse(
      prompt,
      (chunk) => {
        // Append chunk to last message.
        messages[assistantMessageIndex] += chunk;
        throttledUpdate();
      },
      {
        model: process.env.OLLAMA_MODEL || 'llama3.2:latest',
      },
    );

    // Final update after streaming completes.
    updateMessages();
    // Add blank line after assistant response.
    messages.push('');
    updateMessages();
  } catch (error) {
    messages[assistantMessageIndex] = `{red-fg}Error:{/} ${error instanceof Error ? error.message : String(error)}`;
    updateMessages();
    // Add blank line after error.
    messages.push('');
    updateMessages();
  } finally {
    isStreaming = false;
  }
});

// Input box cursor navigation (Emacs-style).
// Note: textarea has built-in Ctrl+A and Ctrl+E support, but we ensure they work.
inputBox.key(['home', 'C-a'], function (this: any) {
  // Move to start of line
  if (this._cline !== undefined) {
    this._cline.ci = 0;
  }
  screen.render();
});

inputBox.key(['end', 'C-e'], function (this: any) {
  // Move to end of line.
  if (this._cline !== undefined && this._cline.line) {
    this._cline.ci = this._cline.line.length;
  }
  screen.render();
});

// Handle Page Up/Down for scrolling.
messageBox.key(['pageup'], () => {
  messageBox.scroll(-5);
  screen.render();
});

messageBox.key(['pagedown'], () => {
  messageBox.scroll(5);
  screen.render();
});

// Focus handling.
screen.key(['tab'], () => {
  if (screen.focused === inputBox) {
    messageBox.focus();
  } else {
    inputBox.focus();
  }
  screen.render();
});

// Prevent Ctrl+K from clearing the screen (Note: Command+K on macOS is a terminal-level
// shortcut that cannot be intercepted, but the screen will restore on any interaction).
screen.key(['C-k'], () => {
  // Do nothing - prevent default clear screen behavior.
  return false;
});

inputBox.key(['C-k'], () => {
  // Do nothing - prevent default clear screen behavior.
  return false;
});

// Add Ctrl+R to manually refresh/redraw the screen (helps recover from Cmd+K clears).
const forceRefresh = () => {
  // Force a complete redraw by clearing and re-rendering all elements.
  try {
    screen.realloc();
  } catch (e) {
    // realloc might not work on all systems.
  }

  // Reset all element content.
  header.setContent(
    '{bold}{cyan-fg}DXOS CLI - Terminal UI{/}\n' +
      '{gray-fg}Tab to switch focus • Page Up/Down to scroll • Enter to send • Ctrl+R refresh • Esc to quit{/}',
  );

  // Force update messages
  const content = messages.join('\n');
  messageBox.setContent(content);
  messageBox.scrollTo(messages.length);

  // Force screen render multiple times to ensure it takes.
  screen.render();
  setImmediate(() => screen.render());
};

screen.key(['C-r'], () => {
  forceRefresh();
  return false;
});

inputBox.key(['C-r'], () => {
  forceRefresh();
  return false;
});

// Cleanup and exit handler.
const exitApp = () => {
  screen.destroy();
  process.exit(0);
};

// Quit on Escape or Ctrl+C.
screen.key(['escape', 'C-c'], exitApp);

// Also handle Ctrl+C from input box (in case it captures it first).
inputBox.key(['C-c'], exitApp);

// Handle process signals
process.on('SIGINT', exitApp);
process.on('SIGTERM', exitApp);

// Handle screen resize and refresh - this helps restore content if terminal is cleared.
screen.on('resize', () => {
  updateMessages();
  screen.render();
});

// Add all elements to screen.
screen.append(header);
screen.append(messageBox);
screen.append(inputBox);

// Focus input initially.
inputBox.focus();

// Initial render.
screen.render();

// Check Ollama server and show instructions.
setTimeout(async () => {
  const ollamaAvailable = await checkOllamaServer();
  if (ollamaAvailable) {
    messages.push(
      '{green-fg}✓{/green-fg} Ollama server connected',
      '{gray-fg}Type a message and press Enter to chat{/gray-fg}',
      '',
    );
  } else {
    messages.push(
      '{red-fg}✗{/red-fg} Ollama server not available',
      '{gray-fg}Start Ollama with: ollama serve{/gray-fg}',
      '{gray-fg}Pull a model with: ollama pull llama3.2{/gray-fg}',
      '',
    );
  }

  updateMessages();

  header.setContent(
    '{bold}{cyan-fg}DXOS CLI - Terminal UI{/}\n' +
      '{gray-fg}Tab to switch focus • Page Up/Down to scroll • Enter to send • Ctrl+R refresh • Esc to quit{/}',
  );
  screen.render();
}, 100);
