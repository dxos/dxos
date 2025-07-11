//
// Copyright 2025 DXOS.org
//

import { Message } from '@dxos/ai';
import { AISession, type Blueprint, BlueprintBinding } from '@dxos/assistant';
import { Obj, Ref } from '@dxos/echo';
import type { Queue } from '@dxos/echo-db';
import { AiService, ToolResolverService, type ServiceContainer } from '@dxos/functions';
import { ComplexSet } from '@dxos/util';

export interface ConversationRunOptions {
  prompt: string;
}

export type ConversationOptions = {
  serviceContainer: ServiceContainer;
  queue: Queue<Message | BlueprintBinding>;
  onBegin?: (session: AISession) => void;
  onEnd?: (session: AISession) => void;
};

/**
 * Persistent conversation state.
 * Context + history + artifacts.
 * Backed by a Queue.
 */
export class Conversation {
  private readonly _serviceContainer: ServiceContainer;
  private readonly _queue: Queue<Message | BlueprintBinding>;
  private readonly _onBegin?: (session: AISession) => void = undefined;
  private readonly _onEnd?: (session: AISession) => void = undefined;

  constructor(options: ConversationOptions) {
    this._serviceContainer = options.serviceContainer;
    this._queue = options.queue;
    this._onBegin = options.onBegin;
    this._onEnd = options.onEnd;
  }

  readonly blueprints = {
    bind: async (blueprint: Ref.Ref<Blueprint>): Promise<void> => {
      await this._queue.append([
        Obj.make(BlueprintBinding, {
          added: [blueprint],
          removed: [],
        }),
      ]);
    },

    unbind: async (blueprint: Ref.Ref<Blueprint>): Promise<void> => {
      await this._queue.append([
        Obj.make(BlueprintBinding, {
          added: [],
          removed: [blueprint],
        }),
      ]);
    },

    query: async (): Promise<Ref.Ref<Blueprint>[]> => {
      const queueItems = await this._queue.queryObjects();

      const bindings = new ComplexSet<Ref.Ref<Blueprint>>((ref) => ref.dxn.toString());
      for (const item of queueItems) {
        if (Obj.instanceOf(BlueprintBinding, item)) {
          for (const bp of item.removed) {
            bindings.delete(bp);
          }
          for (const bp of item.added) {
            bindings.add(bp);
          }
        }
      }
      return Array.from(bindings);
    },
  };

  async run(options: ConversationRunOptions) {
    const session = new AISession({
      operationModel: 'configured',
    });
    this._onBegin?.(session);

    const history = await this.getHistory();
    const blueprints = await Ref.Array.loadAll(await this.blueprints.query());
    if (blueprints.length > 1) {
      throw new Error('Multiple blueprints are not yet supported.');
    }

    const messages = await session.run({
      history,
      prompt: options.prompt,
      systemPrompt: blueprints.at(0)?.instructions,
      artifacts: [],
      tools: blueprints.at(0)?.tools ?? [],
      client: this._serviceContainer.getService(AiService).client,
      toolResolver: this._serviceContainer.getService(ToolResolverService).toolResolver,
      extensions: {
        serviceContainer: this._serviceContainer,
      },
    });

    await this._queue.append(messages);

    this._onEnd?.(session);
  }

  async getHistory(): Promise<Message[]> {
    const queueItems = await this._queue.queryObjects();
    return queueItems.filter(Obj.instanceOf(Message));
  }
}
