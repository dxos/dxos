//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import blessed, { type Widgets } from 'blessed';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Runtime from 'effect/Runtime';
import * as Schema from 'effect/Schema';

import { AiService, DEFAULT_EDGE_MODEL, type ToolExecutionService, type ToolResolverService } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { AiConversation, makeToolExecutionServiceFromFunctions, makeToolResolverFromFunctions } from '@dxos/assistant';
import { Client, Config } from '@dxos/client';
import { type Database } from '@dxos/echo';
import { CredentialsService, type FunctionInvocationService, type QueueService, TracingService } from '@dxos/functions';
import { FunctionInvocationServiceLayerTestMocked, TestDatabaseLayer } from '@dxos/functions-runtime/testing';
import { type Message } from '@dxos/types';

import { checkOllamaServer, streamOllamaResponse } from '../util';

// TODO(burdon): Factor out (see plugin-assistant/processor.ts)
export type AiChatServices =
  | CredentialsService
  | Database.Service
  | QueueService
  | FunctionInvocationService
  | AiService.AiService
  | ToolExecutionService
  | ToolResolverService
  | TracingService;

const TestToolkit = Toolkit.make(
  Tool.make('random', {
    description: 'Random number generator',
    parameters: {},
    success: Schema.Number,
  }),
);

// TODO(burdon): Create minimal toolkit.
const toolkit = Toolkit.merge(TestToolkit) as Toolkit.Toolkit<any>;

const TestServicesLayer = Layer.mergeAll(
  TracingService.layerNoop,
  AiServiceTestingPreset('direct'),
  TestDatabaseLayer({}),
  FunctionInvocationServiceLayerTestMocked({ functions: [] }).pipe(Layer.provideMerge(TracingService.layerNoop)),
);

const TestLayer: Layer.Layer<AiChatServices, never, never> = Layer.mergeAll(
  AiService.model('@anthropic/claude-opus-4-0'),
  makeToolResolverFromFunctions([], toolkit),
  makeToolExecutionServiceFromFunctions(toolkit, toolkit.toLayer({}) as any),
  CredentialsService.layerFromDatabase(),
).pipe(Layer.provideMerge(TestServicesLayer), Layer.orDie);

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

  private _client?: Client;
  private _conversation?: AiConversation;
  private _services?: Runtime.Runtime<AiChatServices>;

  private readonly _exitHandler = () => this._exit();
  private readonly _resizeHandler = () => this._handleResize();

  /**
   * Initialize the TUI application.
   */
  async initialize(): Promise<void> {
    // Check Ollama server and initialize client.
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
    // Clear any pending timeouts.
    if (this._updateTimeout) {
      clearTimeout(this._updateTimeout);
      this._updateTimeout = null;
    }

    // Remove signal handlers.
    process.off('SIGINT', this._exitHandler);
    process.off('SIGTERM', this._exitHandler);

    // Destroy client.
    if (this._client) {
      await this._client.destroy();
      this._client = undefined;
    }

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
    const identity = this._client?.halo.identity.get();
    this._header = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: `{bold}{cyan-fg}DXOS CLI - (Identity: ${identity?.did}){/}`,
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
      height: 5,
      inputOnFocus: true,
      keys: true,
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
    const config = new Config();
    this._client = new Client({ config });
    await this._client.initialize();
    const identity = this._client.halo.identity.get();
    if (!identity?.identityKey) {
      await this._client.halo.createIdentity();
    }

    await this._client.spaces.waitUntilReady();
    const space = this._client.spaces.default;
    const queue = space.queues.create<Message.Message>();
    this._conversation = new AiConversation(queue);

    // TODO(burdon): Effect.
    // this._services = yield * Effect.runtime<AiChatServices>();

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
      // TODO(burdon): See processor.test.ts
      if (this._conversation && this._services) {
        const request = this._conversation.createRequest({ prompt });
        const fiber = request.pipe(
          Effect.provide(AiService.model(DEFAULT_EDGE_MODEL)),
          Effect.asVoid,
          Runtime.runFork(this._services),
        );
        const response = await fiber.pipe(Fiber.join, Effect.runPromiseExit);
        console.log(response);
      }

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
