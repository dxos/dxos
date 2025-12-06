//
// Copyright 2025 DXOS.org
//

import blessed, { type Widgets } from 'blessed';
import * as Effect from 'effect/Effect';

import { GenerationObserver } from '@dxos/assistant';

import { type Core, checkOllamaServer, streamOllamaResponse } from '../core';

const ollama = false;

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

/**
 * DXOS CLI TUI - Terminal User Interface.
 * Built with blessed for zero-flicker performance.
 */
export class App {
  private _screen!: Widgets.Screen;
  private _header!: Widgets.BoxElement;
  private _messageBox!: Widgets.BoxElement;
  private _inputBox!: Widgets.TextareaElement;

  private _messages: string[] = [];
  private _isStreaming = false;
  private _updateTimeout: NodeJS.Timeout | null = null;

  private readonly _exitHandler = () => this._exit();
  private readonly _resizeHandler = () => this._handleResize();

  constructor(private _core: Core.Core) {}

  /**
   * Initialize the TUI application.
   */
  async initialize(): Promise<void> {
    await this._core.open();
    await this._initializeServices();

    this._createScreen();
    this._createHeader();
    this._createMessageBox();
    this._createInputBox();
    this._setupKeyBindings();
    this._setupSignalHandlers();

    // Add all elements to screen.
    this._screen.append(this._header);
    this._screen.append(this._messageBox);
    this._screen.append(this._inputBox);

    // Focus input initially.
    this._inputBox.focus();

    // Initial render.
    this._screen.render();
  }

  /**
   * Destroy the TUI application and cleanup resources.
   */
  async destroy(): Promise<void> {
    await this._core.close();

    // Clear any pending timeouts.
    if (this._updateTimeout) {
      clearTimeout(this._updateTimeout);
      this._updateTimeout = null;
    }

    // Remove signal handlers.
    process.off('SIGINT', this._exitHandler);
    process.off('SIGTERM', this._exitHandler);

    // Destroy screen.
    if (this._screen) {
      this._screen.destroy();
    }
  }

  /**
   * Create the blessed screen.
   */
  private _createScreen(): void {
    // @ts-ignore - blessed types are incomplete.
    this._screen = blessed.screen({
      smartCSR: true,
      fullUnicode: true,
      title: 'DXOS CLI',
      warnings: false,
      forceUnicode: true,
      resizeTimeout: 300,
    });
  }

  /**
   * Create the header element.
   */
  private _createHeader(): void {
    const did = this._core.client?.halo.identity.get()?.did;
    this._header = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      padding: { left: 1, right: 1 },
      content: `{bold}{cyan-fg}DXOS CLI - (Identity: ${did}){/}`,
      tags: true,
      border: 'line' as any,
      style: {
        border: {
          fg: 'blue',
        },
      },
    });
  }

  /**
   * Create the scrollable message box.
   */
  private _createMessageBox(): void {
    this._messageBox = blessed.box({
      top: 3,
      left: 0,
      right: 0,
      bottom: 5,
      scrollable: true,
      alwaysScroll: true,
      tags: true,
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
      padding: { left: 1, right: 1 },
      style: {
        border: {
          fg: 'gray',
        },
      },
    });
  }

  /**
   * Create the input box.
   */
  private _createInputBox(): void {
    this._inputBox = blessed.textarea({
      bottom: 0,
      left: 0,
      right: 0,
      height: 8,
      inputOnFocus: true,
      keys: true,
      mouse: true,
      border: 'line' as any,
      padding: { left: 1, right: 1 },
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
  }

  /**
   * Setup all key bindings.
   */
  private _setupKeyBindings(): void {
    // Handle Enter key to submit.
    this._inputBox.key(['enter'], () => {
      const value = (this._inputBox as any).getValue();
      const prompt = value.trim();
      if (!prompt || this._isStreaming) {
        return false;
      }
      (this._inputBox as any).emit('submit', value);
      return false;
    });

    // Allow Shift+Enter for multi-line input.
    this._inputBox.key(['S-enter'], () => {
      (this._inputBox as any).insertText('\n');
      return false;
    });

    // Handle input submission.
    this._inputBox.on('submit', (value) => this._handleSubmit(value));

    // Input box cursor navigation (Emacs-style).
    this._inputBox.key(['home', 'C-a'], () => {
      const inputBox = this._inputBox as any;
      if (inputBox._cline !== undefined) {
        inputBox._cline.ci = 0;
      }
      this._screen.render();
    });

    this._inputBox.key(['end', 'C-e'], () => {
      const inputBox = this._inputBox as any;
      if (inputBox._cline !== undefined && inputBox._cline.line) {
        inputBox._cline.ci = inputBox._cline.line.length;
      }
      this._screen.render();
    });

    // Handle Page Up/Down for scrolling.
    this._messageBox.key(['pageup'], () => {
      this._messageBox.scroll(-5);
      this._screen.render();
    });

    this._messageBox.key(['pagedown'], () => {
      this._messageBox.scroll(5);
      this._screen.render();
    });

    // Focus handling.
    this._screen.key(['tab'], () => {
      if (this._screen.focused === this._inputBox) {
        this._messageBox.focus();
      } else {
        this._inputBox.focus();
      }
      this._screen.render();
    });

    // Prevent Ctrl+K from clearing the screen.
    this._screen.key(['C-k'], () => false);
    this._inputBox.key(['C-k'], () => false);

    // Add Ctrl+R to manually refresh/redraw the screen.
    this._screen.key(['C-r'], () => {
      this._forceRefresh();
      return false;
    });

    this._inputBox.key(['C-r'], () => {
      this._forceRefresh();
      return false;
    });

    // Quit on Escape or Ctrl+C.
    this._screen.key(['escape', 'C-c'], this._exitHandler);
    this._inputBox.key(['C-c'], this._exitHandler);

    // Handle screen resize.
    this._screen.on('resize', this._resizeHandler);
  }

  /**
   * Setup process signal handlers.
   */
  private _setupSignalHandlers(): void {
    process.on('SIGINT', this._exitHandler);
    process.on('SIGTERM', this._exitHandler);
  }

  /**
   * Initialize services (Ollama, DXOS client).
   */
  private async _initializeServices(): Promise<void> {
    if (ollama) {
      const ollamaAvailable = await checkOllamaServer();
      if (ollamaAvailable) {
        this._messages.push(
          '{green-fg}✓{/green-fg} Ollama server connected',
          '{gray-fg}Type a message and press Enter to chat{/gray-fg}',
          '',
        );
      } else {
        this._messages.push(
          '{red-fg}✗{/red-fg} Ollama server not available',
          '{gray-fg}Start Ollama with: ollama serve{/gray-fg}',
          '{gray-fg}Pull a model with: ollama pull llama3.2{/gray-fg}',
          '',
        );
      }
    }
  }

  /**
   * Handle input submission.
   */
  private async _handleSubmit(value: string): Promise<void> {
    const prompt = value.trim();
    if (!prompt || this._isStreaming) {
      return;
    }

    // Add user message.
    this._messages.push(`{cyan-fg}User:{/} ${prompt}`);
    this._updateMessages();

    // Clear input.
    this._inputBox.clearValue();
    this._inputBox.focus();

    // Start streaming assistant response.
    this._isStreaming = true;
    this._messages.push('{green-fg}Assistant:{/} ');
    const assistantMessageIndex = this._messages.length - 1;

    try {
      if (ollama) {
        await streamOllamaResponse(
          prompt,
          (chunk) => {
            this._messages[assistantMessageIndex] += chunk;
            this._throttledUpdate();
          },
          {
            model: process.env.OLLAMA_MODEL || 'llama3.2:latest',
          },
        );
      } else {
        await this._core.request({
          prompt,
          observer: GenerationObserver.make({
            onPart: (part) =>
              Effect.sync(() => {
                if (part.type === 'text-delta') {
                  this._messages[assistantMessageIndex] += part.delta;
                  this._throttledUpdate();
                }
              }),
          }),
        });
      }

      this._updateMessages();
      this._messages.push('');
      this._updateMessages();
    } catch (error) {
      this._messages[assistantMessageIndex] =
        `{red-fg}Error:{/} ${error instanceof Error ? error.message : String(error)}`;
      this._updateMessages();
      this._messages.push('');
      this._updateMessages();
    } finally {
      this._isStreaming = false;
    }
  }

  /**
   * Update the message display.
   */
  private _updateMessages(): void {
    const content = this._messages.join('\n');
    this._messageBox.setContent(content);
    this._messageBox.scrollTo(this._messages.length);
    this._screen.render();
  }

  /**
   * Throttled update for streaming (max 20 updates/sec).
   */
  private _throttledUpdate(): void {
    if (this._updateTimeout) {
      return;
    }
    this._updateTimeout = setTimeout(() => {
      this._updateMessages();
      this._updateTimeout = null;
    }, 50);
  }

  /**
   * Force a complete screen refresh.
   */
  private _forceRefresh(): void {
    try {
      this._screen.realloc();
    } catch {
      // realloc might not work on all systems.
    }

    const content = this._messages.join('\n');
    this._messageBox.setContent(content);
    this._messageBox.scrollTo(this._messages.length);
    this._screen.render();
    setImmediate(() => this._screen.render());
  }

  /**
   * Handle screen resize.
   */
  private _handleResize(): void {
    this._updateMessages();
    this._screen.render();
  }

  /**
   * Exit the application.
   */
  private _exit(): void {
    this._screen.destroy();
    process.exit(0);
  }
}
