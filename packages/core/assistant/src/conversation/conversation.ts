//
// Copyright 2025 DXOS.org
//

import { Message, type ExecutableTool } from '@dxos/ai';
import { type ArtifactDefinition } from '@dxos/artifact';
import { Event } from '@dxos/async';
import { Obj, Ref } from '@dxos/echo';
import { type Queue } from '@dxos/echo-db';
import { AiService, ToolResolverService, type ServiceContainer } from '@dxos/functions';

import { BlueprintBinder, type BlueprintBinding } from '../blueprint';
import { AISession, type SessionRunOptions } from '../session';

export interface ConversationRunOptions {
  systemPrompt?: string;
  prompt: string;

  /**
   * @depreacated
   */
  requiredArtifactIds?: string[];

  executableTools?: ExecutableTool[];
  artifacts?: ArtifactDefinition[];
  extensions?: ToolContextExtensions;
  generationOptions?: SessionRunOptions['generationOptions'];

  // TODO(dmaretskyi): Move into conversation.
  artifactDiffResolver?: SessionRunOptions['artifactDiffResolver'];
}

export type ConversationOptions = {
  serviceContainer: ServiceContainer;
  queue: Queue<Message | BlueprintBinding>;
};

/**
 * Persistent conversation state.
 * Context + history + artifacts.
 * Backed by a Queue.
 */
export class Conversation {
  private readonly _serviceContainer: ServiceContainer;
  private readonly _queue: Queue<Message | BlueprintBinding>;

  /**
   * Fired when the execution loop begins.
   * This is called before the first message is sent.
   */
  public readonly onBegin = new Event<AISession>();

  /**
   * Blueprints that are bound to the conversation.
   */
  public readonly blueprints: BlueprintBinder;

  constructor(options: ConversationOptions) {
    this._serviceContainer = options.serviceContainer;
    this._queue = options.queue;
    this.blueprints = new BlueprintBinder(this._queue);
  }

  async run(options: ConversationRunOptions): Promise<Message[]> {
    const session = new AISession({
      operationModel: 'configured',
    });
    this.onBegin.emit(session);

    const history = await this.getHistory();
    const blueprints = await Ref.Array.loadAll(await this.blueprints.query());
    if (blueprints.length > 1) {
      throw new Error('Multiple blueprints are not yet supported.');
    }

    const messages = await session.run({
      history,
      prompt: options.prompt,
      systemPrompt: (options.systemPrompt ?? '') + (blueprints.at(0)?.instructions ?? ''),

      // TODO(dmaretskyi): Artifacts come from the blueprint.
      artifacts: options.artifacts ?? [],
      tools: blueprints.at(0)?.tools ?? [],
      executableTools: options.executableTools,
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
