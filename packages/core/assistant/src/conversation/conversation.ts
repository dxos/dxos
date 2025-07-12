//
// Copyright 2025 DXOS.org
//

import { Message, type ExecutableTool } from '@dxos/ai';
import type { ArtifactDefinition } from '@dxos/artifact';

import { Obj, Ref, type Relation } from '@dxos/echo';
import type { Queue } from '@dxos/echo-db';
import { AiService, ToolResolverService, type ServiceContainer } from '@dxos/functions';
import { ComplexSet } from '@dxos/util';
import { AISession, SessionRunOptions } from '../session';
import { Blueprint, BlueprintBinding } from '../blueprint';
import { Event } from '@dxos/async';
import { Array, pipe } from 'effect';
import { computed } from '@preact/signals-core';

export interface ConversationRunOptions {
  prompt: string;

  systemPrompt?: string;

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

/**
 * Manages a set of blueprints that are bound to the conversation queue.
 */
export class BlueprintBinder {
  constructor(private readonly _queue: Queue) {}

  bind = async (blueprint: Ref.Ref<Blueprint>): Promise<void> => {
    await this._queue.append([
      Obj.make(BlueprintBinding, {
        added: [blueprint],
        removed: [],
      }),
    ]);
  };

  unbind = async (blueprint: Ref.Ref<Blueprint>): Promise<void> => {
    await this._queue.append([
      Obj.make(BlueprintBinding, {
        added: [],
        removed: [blueprint],
      }),
    ]);
  };

  /**
   * Asynchronous query of all bound blueprints.
   */
  query = async (): Promise<readonly Ref.Ref<Blueprint>[]> => {
    const queueItems = await this._queue.queryObjects();
    return this._reduce(queueItems);
  };

  /**
   * Reactive query of all bound blueprints.
   */
  bindings = computed(() => this._reduce(this._queue.objects));

  private _reduce(items: (Obj.Any | Relation.Any)[]): readonly Ref.Ref<Blueprint>[] {
    return pipe(
      items,
      Array.filter(Obj.instanceOf(BlueprintBinding)),
      Array.reduce(new ComplexSet<Ref.Ref<Blueprint>>((ref) => ref.dxn.toString()), (bindings, item) => {
        item.removed.forEach((item) => bindings.delete(item));
        item.added.forEach((item) => bindings.add(item));
        return bindings;
      }),
      Array.fromIterable,
    );
  }
}
