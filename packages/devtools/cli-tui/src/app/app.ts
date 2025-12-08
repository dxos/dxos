//
// Copyright 2025 DXOS.org
//

import blessed, { type Widgets } from 'blessed';
import * as Effect from 'effect/Effect';

import { GenerationObserver } from '@dxos/assistant';
import { safeParseJson, trim } from '@dxos/util';

import { version } from '../../package.json';
import { type Core } from '../core';

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
  private readonly _exitHandler = () => this._exit();
  private readonly _resizeHandler = () => this._handleResize();

  private _screen!: Widgets.Screen;
  private _messageBox!: Widgets.BoxElement;
  private _inputBox!: Widgets.TextareaElement;
  private _indicator!: Widgets.BoxElement;
  private _status!: Widgets.BoxElement;
  private _logo!: Widgets.BoxElement;

  private _messages: string[] = [];
  private _isStreaming = false;
  private _updateTimeout: NodeJS.Timeout | null = null;
  private _indicatorInterval: NodeJS.Timeout | null = null;

  constructor(private _core: Core.Core) {}

  /**
   * Initialize the TUI application.
   */
  async initialize(): Promise<void> {
    await this._core.open();

    // Setup UI.
    this._createScreen();
    this._setupKeyBindings();
    this._setupSignalHandlers();
    this._updateStatus();

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
    if (this._indicatorInterval) {
      clearInterval(this._indicatorInterval);
      this._indicatorInterval = null;
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
  private _createScreen(options: { prompt: number } = { prompt: 4 }): void {
    // Screen.
    this._screen = blessed.screen({
      smartCSR: true,
      fullUnicode: true,
      title: 'DXOS CLI',
      warnings: false,
      forceUnicode: true,
      resizeTimeout: 300,
    });

    // Message viewport.
    this._messageBox = blessed.box({
      top: 0,
      left: 0,
      right: 0,
      bottom: options.prompt + 2,
      scrollable: true,
      alwaysScroll: true,
      tags: true,
      scrollbar: {
        ch: '│',
        style: {
          fg: 'yellow',
        },
      },
      keys: true,
      vi: true,
      mouse: true,
      padding: { left: 1, right: 1 },
    });

    // Border.
    this._screen.append(
      blessed.box({
        bottom: 1,
        height: options.prompt,
        left: 0,
        width: 2,
        border: {
          type: 'line',
          left: false,
          right: true,
          top: false,
          bottom: false,
        } as any,
        style: {
          border: {
            fg: 'bright-green',
            left: '│',
          },
        },
      }),
    );

    // Prompt.
    this._inputBox = blessed.textarea({
      bottom: 1,
      height: options.prompt,
      left: 2,
      right: 2,
      inputOnFocus: true,
      keys: true,
      mouse: true,
      padding: {
        left: 1,
        right: 1,
      },
      style: {
        bg: 'black',
        focus: {
          bg: 'black',
        },
      },
      tags: true,
    });

    // Streaming indicator.
    this._indicator = blessed.box({
      bottom: 0,
      left: 2,
      height: 1,
      width: 12,
      tags: true,
      content: '{grey-fg}Ctrl-c{/}',
    });

    // Status.
    this._status = blessed.box({
      bottom: 0,
      left: 14,
      height: 1,
      right: 2,
      tags: true,
      style: {
        fg: 'grey-fg',
      },
    });

    const banner = BANNER.split('\n');
    this._logo = blessed.box({
      top: `50%-${Math.floor((banner.length + options.prompt + 2) / 2)}`,
      left: 'center',
      width: banner[0].length,
      height: banner.length + 1,
      tags: true,
      style: {
        fg: 'green-fg',
      },
      content: `{green-fg}${banner.join('\n')}{/}\n{|}{white-fg}${version}{/}`,
    });

    // Add all elements to screen.
    this._screen.append(this._messageBox);
    this._screen.append(this._inputBox);
    this._screen.append(this._indicator);
    this._screen.append(this._status);
    this._screen.append(this._logo);
  }

  /**
   * Update status bar.
   */
  private _updateStatus(): void {
    const logo = 'Ⓓ Ⓧ Ⓞ Ⓢ ';
    const identityDid = this._core.client?.halo.identity.get()?.did || '';
    const resolver = this._core.resolverName;
    this._status.setContent(
      `{|}{yellow-fg}(${resolver}){/} {white-fg}${this._core.model}{/} {grey-fg}${identityDid}{/} {green-fg}${logo}{/}`,
    );
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
   * Handle input submission.
   */
  private async _handleSubmit(value: string): Promise<void> {
    const prompt = value.trim();
    if (!prompt || this._isStreaming) {
      return;
    }

    // Hide logo on first request.
    if (this._logo.visible) {
      this._logo.hide();
    }

    // Add user message.
    this._messages.push(`{cyan-fg}⟫{/} ${prompt}\n`);
    this._updateMessages();

    // Clear input.
    this._inputBox.clearValue();
    this._inputBox.focus();

    this._messages.push('{green-fg}Assistant:{/} ');
    const assistantMessageIndex = this._messages.length - 1;

    try {
      // Start streaming assistant response.
      this._isStreaming = true;
      this._startIndicator();
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

      this._updateMessages();
      this._messages.push('');
      this._updateMessages();
    } catch (err) {
      // TODO(burdon): For LMStudio, HttpRequest was thrown.
      // TODO(burdon): Flag to exit on error.
      const message = parseError(err);
      // if (!message) {
      this._exit(err as Error);
      // }

      this._messages[assistantMessageIndex] = `{red-fg}Error:{/} ${message}`;
      this._updateMessages();
      this._messages.push('');
      this._updateMessages();
    } finally {
      this._stopIndicator();
      this._isStreaming = false;
    }
  }

  /**
   * Update the message display.
   */
  private _updateMessages(): void {
    const content = this._formatContent(this._messages.join('\n'));
    this._messageBox.setContent(content);
    // Scroll to bottom based on actual content height.
    const scrollHeight = this._messageBox.getScrollHeight();
    this._messageBox.scrollTo(scrollHeight);
    this._screen.render();
  }

  /**
   * Format content with syntax highlighting for fenced code blocks.
   */
  private _formatContent(content: string): string {
    const lines = content.split('\n');
    const result: string[] = [];
    let inCodeBlock = false;
    const width = (this._messageBox.width as number) - 3; // Account for padding.

    for (const line of lines) {
      if (line.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        const paddedLine = line.padEnd(width);
        result.push(`{black-bg}{grey-fg}${paddedLine}{/}`);
      } else if (inCodeBlock) {
        const paddedLine = line.padEnd(width);
        result.push(`{black-bg}${paddedLine}{/}`);
      } else {
        result.push(line);
      }
    }

    return result.join('\n');
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

    const content = this._formatContent(this._messages.join('\n'));
    this._messageBox.setContent(content);
    const scrollHeight = this._messageBox.getScrollHeight();
    this._messageBox.scrollTo(scrollHeight);
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
   * Start the streaming indicator animation.
   */
  private _startIndicator(): void {
    let phase = 0;
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'].map((c) => c + ' Processing');
    this._indicatorInterval = setInterval(() => {
      phase = (phase + 1) % frames.length;
      this._indicator.setContent(`{cyan-fg}${frames[phase]}{/}`);
      this._screen.render();
    }, 80);
  }

  /**
   * Stop the streaming indicator animation.
   */
  private _stopIndicator(): void {
    if (this._indicatorInterval) {
      clearInterval(this._indicatorInterval);
      this._indicatorInterval = null;
    }
    this._indicator.setContent('');
    this._screen.render();
  }

  /**
   * Exit the application.
   */
  private _exit(err?: Error): void {
    this._screen.destroy();
    if (err) {
      console.error(String(err));
      console.log(JSON.stringify(err, null, 2));
      const body = (err as any).body;
      if (body) {
        console.log(JSON.stringify(safeParseJson(JSON.parse(body)), null, 2));
      }
    }

    process.exit(err ? 1 : 0);
  }
}

// TODO(burdon): Factor out (see error log in LM Studio Developer tab).
const parseError = (err: any): string | undefined => {
  const str = String(err);
  if (str.toLowerCase().includes('error loading model')) {
    return 'Model not found';
  }
};

// https://textfancy.com/text-art/

const BANNER = trim`

┏━━━┓━┓┏━┓━━━┓━━━┓
┗┓┏┓┃┓┗┛┏┛┏━┓┃┏━┓┃
╋┃┃┃┃┗┓┏┛╋┃╋┃┃┗━━┓
╋┃┃┃┃┏┛┗┓╋┃╋┃┃━━┓┃
┏┛┗┛┃┛┏┓┗┓┗━┛┃┗━┛┃
┗━━━┛━┛┗━┛━━━┛━━━┛

`;

const _BANNER2 = trim`

┏━━━┓━┓┏━┓━━━┓━━━┓
┗┓┏┓┃┓┗┛┏┃┏━┓┃┏━┓┃
 ┃┃┃┃┗┓┏┛┃┃ ┃┃┗━━┓
 ┃┃┃┃┏┛┗┓┃┃ ┃┃━━┓┃
┏┛┗┛┃┛┏┓┗┃┗━┛┃┗━┛┃
┗━━━┛━┛┗━┛━━━┛━━━┛

`;

const _BANNER3 = trim`

██████╗ ██╗  ██╗   ██████╗ ███████╗ 
██╔══██╗╚██╗██╔╝  ██╔═══██╗██╔════╝ 
██║  ██║ ╚███╔╝   ██║   ██║███████╗ 
██║  ██║ ██╔██╗   ██║   ██║╚════██║ 
██████╔╝██╔╝ ██╗  ╚██████╔╝███████║ 
╚═════╝ ╚═╝  ╚═╝   ╚═════╝ ╚══════╝ 

`;

// https://www.asciiart.eu/image-to-ascii

const _BANNER4 = trim`
                                                         
 AAAA                                               AAAA 
  EAAAAA                                         AAAAAE  
    AEAAAAA                                   AAAAEAE    
     AAE EAAAA                             AAAAE AAA     
      EAAA  AAAAA                       AAAEA  AAAE      
        AAA    AEAAA                 AAAAA    AEA        
         AAA      AAAAA           AAAAE      AAA         
          EAAE       EAAAE     AAAEA       EAEA          
            AAA         AAAAAAAEA         AAA            
             AAA          EAAEA          AAA             
              EAAA       AAAAAAA       AAEE              
                AAA     AAEAEAEAA     AAA                
                 AAA  AAEA AAA AAAA  AAA                 
                  EAAAAA   AEA   AAAAEE                  
                    AEA    AAA    AEA                    
                  EAAAAA   EAA   AAAAAE                  
                 AAA  AAAA AAA AEAE  AAA                 
                AAA     AAEAEAEAA     AAA                
              AAEA       AAAAAAA       AEAE              
             AAA          EAAAE          AAA             
            AAE         AAAAAEAAA         AAA            
          EAAE       AAAAA     AAAAA       EAAA          
         AAA      AAAAA           AAAAA      AAA         
        AAE    AAAAE                 AAAAA    EAA        
      AAEA  AAAEA                       EAAAA  AAAA      
     AAA EAAEA                             AAAAE AAA     
    AEAEAAA                                   AAAEAEA    
  EAAAAA                                         AAAAAE  
 EAAA                                               AAAE 
                                                         
`;
