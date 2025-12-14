//
// Copyright 2025 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Runtime from 'effect/Runtime';

import { AiService, type ModelName } from '@dxos/ai';
import {
  AiConversation,
  type AiSessionRunError,
  type AiSessionRunRequirements,
  type GenericToolkit,
  makeToolExecutionServiceFromFunctions,
  makeToolResolverFromFunctions,
} from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { type Space } from '@dxos/client/echo';
import { Filter, Obj, Ref } from '@dxos/echo';
import type { FunctionDefinition } from '@dxos/functions';
import { log } from '@dxos/log';
import { type Message } from '@dxos/types';

import { type AiChatServices } from '../../util';

import { blueprintRegistry } from './blueprints';

// TODO(burdon): Factor out common guts from AiChatProcessor.
export class ChatProcessor {
  constructor(
    private readonly _runtime: Runtime.Runtime<AiChatServices>,
    private readonly _toolkit: GenericToolkit.GenericToolkit,
    private readonly _functions: FunctionDefinition.Any[],
    private readonly _metadata?: AiService.ServiceMetadata,
  ) {}

  get runtime() {
    return this._runtime;
  }

  get toolkit() {
    return this._toolkit;
  }

  get metadata() {
    return this._metadata;
  }

  async execute(
    request: Effect.Effect<Message.Message[], AiSessionRunError, AiSessionRunRequirements>,
    model: ModelName,
  ) {
    const fiber = request.pipe(
      Effect.provide(
        Layer.mergeAll(
          AiService.model(model),
          // TODO(dmaretskyi): Introduce new FunctionRegistry service (injected above) that will provide functions here.
          makeToolResolverFromFunctions(this._functions, this._toolkit.toolkit),
          makeToolExecutionServiceFromFunctions(this._toolkit.toolkit, this._toolkit.layer),
        ),
      ),
      Effect.asVoid,
      Runtime.runFork(this.runtime),
    );

    const response = await fiber.pipe(Fiber.join, Effect.runPromiseExit);
    if (!Exit.isSuccess(response) && !Cause.isInterruptedOnly(response.cause)) {
      const cause = Cause.pretty(response.cause);
      log.error('request failed', { cause });
      throw new Error(cause);
    }
  }

  async createConversation(space: Space, bluerpints: string[]) {
    // TODO(wittjosiah): This is copied from ChatCompanion.tsx.
    const existingBlueprints = await space.db.query(Filter.type(Blueprint.Blueprint)).run();
    for (const key of bluerpints) {
      const existing = existingBlueprints.find((blueprint) => blueprint.key === key);
      if (existing) {
        // TODO(wittjosiah): Stop doing this.
        //   Currently doing this to ensure blueprints are always up-to-date from the registry.
        space.db.remove(existing);
        // continue;
      }

      const blueprint = blueprintRegistry.getByKey(key);
      if (!blueprint) {
        log.warn('blueprint not found', { key });
        continue;
      }

      space.db.add(Obj.clone(blueprint));
      log.info('added blueprint', { key });
    }

    const queue = space.queues.create<Message.Message>();
    const conversation = new AiConversation(space.db, queue);
    await conversation.open();

    const blueprints = await space.db.query(Filter.type(Blueprint.Blueprint)).run();
    await conversation.context.bind({
      blueprints: blueprints.map((blueprint) => Ref.make(blueprint)),
    });

    return conversation;
  }
}
