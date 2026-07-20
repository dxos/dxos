//
// Copyright 2025 DXOS.org
//

import { type Registry } from '@effect-atom/atom-react';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Runtime from 'effect/Runtime';

import { AiService, OpaqueToolkit } from '@dxos/ai';
import { AiRequest, AiSession, ToolExecutionServices } from '@dxos/assistant';
import { Chat } from '@dxos/assistant-toolkit';
import { type Space } from '@dxos/client/echo';
import { OperationHandlerSet, Skill } from '@dxos/compute';
import { Database, Entity, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Message } from '@dxos/types';
import { isTruthy } from '@dxos/util';

import { type AiChatServices, skillRegistry } from '../../util';

export type ChatProcessorOptions = {
  runtime: Runtime.Runtime<AiChatServices>;
  toolkit: OpaqueToolkit.OpaqueToolkit;
  functions: OperationHandlerSet.OperationHandlerSet;
  metadata?: AiService.ServiceMetadata;
  registry?: Registry.Registry;
};

// TODO(burdon): Factor out common guts from AiChatProcessor.
export class ChatProcessor {
  private readonly _runtime: Runtime.Runtime<AiChatServices>;
  private readonly _toolkit: OpaqueToolkit.OpaqueToolkit;
  private readonly _functions: OperationHandlerSet.OperationHandlerSet;
  private readonly _metadata?: AiService.ServiceMetadata;
  private readonly _registry?: Registry.Registry;

  constructor(options: ChatProcessorOptions) {
    this._runtime = options.runtime;
    this._toolkit = options.toolkit;
    this._functions = options.functions;
    this._metadata = options.metadata;
    this._registry = options.registry;
  }

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
    request: Effect.Effect<Message.Message[], AiRequest.RunError, AiRequest.RunRequirements>,
    model: DXN.DXN,
  ) {
    const fiber = request.pipe(
      Effect.provide(
        Layer.mergeAll(AiService.model(DXN.getName(model)), ToolExecutionServices).pipe(
          Layer.provideMerge(OpaqueToolkit.providerLayer(this._toolkit)),
          Layer.provideMerge(OperationHandlerSet.provide(this._functions)),
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

  async createSession(space: Space, skillIds: string[]) {
    const spaceSkills = await space.db.query(Filter.type(Skill.Skill)).run();

    // Add skills to space.
    const skills = skillIds
      .map((key) => {
        const existing = spaceSkills.find((skill) => Obj.getMeta(skill).key === key);
        if (existing) {
          // TODO(wittjosiah): Stop doing this.
          //   Currently doing this to ensure skills are always up-to-date from the registry.
          space.db.remove(existing);
          // continue;
        }

        const candidate = skillRegistry.list().find((e) => Entity.getMeta(e)?.key === key);
        const skill = candidate != null && Obj.instanceOf(Skill.Skill, candidate) ? candidate : undefined;
        if (!skill) {
          log.warn('skill not found', { key });
          return;
        }

        log.info('adding skill', { key });
        return space.db.add(Obj.clone(skill));
      })
      .filter(isTruthy);

    const feed = space.db.add(Feed.make());
    const chat = Chat.make({ feed: Ref.make(feed) });
    Obj.setParent(feed, chat);
    space.db.add(chat);

    const runtime = await EffectEx.runAndForwardErrors(
      Effect.runtime<Database.Service>().pipe(Effect.provide(Database.layer(space.db))),
    );
    const session = new AiSession.Session({ feed, runtime, registry: this._registry });
    await session.open();

    // Bind skills.
    await session.context.bind({
      skills: skills.map((skill) => Ref.make(skill)),
    });

    return session;
  }
}
