//
// Copyright 2025 DXOS.org
//

import { Message, type ExecutableTool } from '@dxos/ai';
import { type ArtifactDefinition } from '@dxos/artifact';
import { Event } from '@dxos/async';
import { Obj, Ref } from '@dxos/echo';
import { type Queue } from '@dxos/echo-db';
import { AiService, ToolResolverService, type ServiceContainer } from '@dxos/functions';
import { log } from '@dxos/log';

import { ContextBinder, type ContextBinding } from '../context';
import { AISession, type SessionRunOptions } from '../session';

export interface ConversationRunOptions {
  systemPrompt?: string;
  prompt: string;

  tools?: ExecutableTool[];
  artifacts?: ArtifactDefinition[];
  extensions?: ToolContextExtensions;
  generationOptions?: SessionRunOptions['generationOptions'];

  /** @depreacated Should be managed by the conversation. */
  requiredArtifactIds?: string[];

  // TODO(dmaretskyi): Move into conversation.
  artifactDiffResolver?: SessionRunOptions['artifactDiffResolver'];
}

export type ConversationOptions = {
  serviceContainer: ServiceContainer;
  queue: Queue<Message | ContextBinding>;
};

/**
 * Persistent conversation state.
 * Context + history + artifacts.
 * Backed by a Queue.
 */
export class Conversation {
  private readonly _serviceContainer: ServiceContainer;
  private readonly _queue: Queue<Message | ContextBinding>;

  /**
   * Fired when the execution loop begins.
   * This is called before the first message is sent.
   */
  public readonly onBegin = new Event<AISession>();

  /**
   * Blueprints bound to the conversation.
   */
  public readonly context: ContextBinder;

  constructor(options: ConversationOptions) {
    this._serviceContainer = options.serviceContainer;
    this._queue = options.queue;
    this.context = new ContextBinder(this._queue);
  }

  async run(options: ConversationRunOptions): Promise<Message[]> {
    const session = new AISession({ operationModel: 'configured' });
    this.onBegin.emit(session);

    const history = await this.getHistory();
    const context = await this.context.query();
    const blueprints = await Ref.Array.loadAll([...context.blueprints]);
    if (blueprints.length > 1) {
      log.warn('multiple blueprints are not yet supported');
    }

    const messages = await session.run({
      history,
      prompt: options.prompt,
      systemPrompt: (options.systemPrompt ?? '') + (blueprints.at(0)?.instructions ?? ''),

      // TODO(dmaretskyi): Artifacts come from the blueprint?
      artifacts: options.artifacts ?? [],
      tools: blueprints.at(0)?.tools ?? [],
      executableTools: options.tools,
      requiredArtifactIds: options.requiredArtifactIds,
      client: this._serviceContainer.getService(AiService).client,
      toolResolver: this._serviceContainer.getService(ToolResolverService).toolResolver,
      extensions: {
        serviceContainer: this._serviceContainer,
        ...options.extensions,
      },
      generationOptions: options.generationOptions,
    });

    await this._queue.append(messages);

    return messages;
  }

  async getHistory(): Promise<Message[]> {
    const queueItems = await this._queue.queryObjects();
    return queueItems.filter(Obj.instanceOf(Message));
  }
}
