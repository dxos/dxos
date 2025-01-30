//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import {
  type AIServiceClientImpl,
  type DefineToolParams,
  type GenerateRequest,
  type GenerationStream,
  type LLMTool,
  Message,
  isToolUse,
  runTools,
} from '@dxos/assistant';
import { createStatic } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
// TODO(wittjosiah): Factor these out from canvas compute because this plugin shouldn't depend on it.
import { type Queue } from '@dxos/react-ui-canvas-compute';
import { ARTIFACTS_SYSTEM_PROMPT } from '@dxos/react-ui-canvas-compute/testing';

// TODO(burdon): Cleanup.
export type Tool = LLMTool | DefineToolParams<any>;

// TODO(burdon): Tests.
export class ChatProcessor {
  private _history: Message[] = [];
  private _pending: Message[] = [];

  private _response: GenerationStream | undefined;

  constructor(
    private readonly _client: AIServiceClientImpl,
    private readonly _queue: Queue<Message>,
    private readonly _tools: Tool[],
    private readonly _context: LLMToolContextExtensions,
    private readonly _options: Pick<GenerateRequest, 'model' | 'systemPrompt'> = {
      model: '@anthropic/claude-3-5-sonnet-20241022',
      systemPrompt: ARTIFACTS_SYSTEM_PROMPT,
    },
  ) {}

  // TOOD(burdon): Make reactive.
  get pending(): Message[] {
    return this._pending;
  }

  get messages(): Message[] {
    return [...this._queue.items, ...this._pending];
  }

  get streaming() {
    return this._pending.length > 0;
  }

  /**
   * Make GPT request.
   */
  async request(message: string) {
    this._history = [...this._queue.items];

    await this._append([
      createStatic(Message, {
        role: 'user',
        content: [{ type: 'text', text: message }],
      }),
    ]);

    await this.generate();
  }

  cancel() {
    this._response?.cancel();
    this._response = undefined;
  }

  // TODO(burdon): Retry.
  private async generate() {
    try {
      let more = false;
      do {
        log.info('requesting...', { history: this._history.length });
        this._response = await this._client.generate({
          ...this._options,
          // TODO(burdon): Rename messages or separate history/message.
          history: this._history,
          tools: this._tools,
        });

        // TODO(dmaretskyi): Have to drain the stream manually.
        queueMicrotask(async () => {
          invariant(this._response);
          for await (const event of this._response) {
            log('event', { event });
            this._pending = this._response.accumulatedMessages.map((message) => createStatic(Message, message));
          }
        });

        const assistantMessages = await this._response.complete();
        log('assistantMessages', { assistantMessages: structuredClone(assistantMessages) });
        await this._append(assistantMessages.map((message) => createStatic(Message, message)));
        this._pending = [];

        // Resolve tool use locally.
        if (isToolUse(assistantMessages.at(-1)!)) {
          log.info('tool request...');
          const response = await runTools({
            tools: this._tools,
            context: this._context,
            message: assistantMessages.at(-1)!,
          });

          log.info('tool response', { response });
          switch (response.type) {
            case 'continue': {
              await this._append([response.message]);
              more = true;
              break;
            }
          }
        }
      } while (more);
    } finally {
      log.info('done');
      this._pending = [];
    }
  }

  private async _append(messages: Message[]) {
    this._queue.append(messages); // TODO(burdon): Append on success only? If approved by user? Clinet/server.
    this._history.push(...messages);
  }
}
