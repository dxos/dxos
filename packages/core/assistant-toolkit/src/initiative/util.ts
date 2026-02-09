//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AiContextBinder, type ContextBinding } from '@dxos/assistant';
import { type Blueprint } from '@dxos/blueprints';
import { Database, Obj, Ref, Relation } from '@dxos/echo';
import { acquireReleaseResource } from '@dxos/effect';
import { QueueService } from '@dxos/functions';
import { Text } from '@dxos/schema';
import { ObjectNotFoundError } from '@dxos/echo/Err';
import type { Message } from '@dxos/types';

import * as Chat from '../chat/Chat';

import { makeBlueprint } from './blueprint';
import { Initiative } from './Initiative';

export const makeInitialized = (
  props: Omit<Obj.MakeProps<typeof Initiative>, 'spec' | 'plan' | 'artifacts' | 'subscriptions' | 'chat'> &
    Partial<Pick<Obj.MakeProps<typeof Initiative>, 'artifacts' | 'subscriptions'>> & {
      spec: string;
      plan?: string;
      blueprints?: Ref.Ref<Blueprint.Blueprint>[];
      contextObjects?: Ref.Ref<Obj.Any>[];
    },
): Effect.Effect<Initiative, never, QueueService | Database.Service> =>
  Effect.gen(function* () {
    const initiative = Obj.make(Initiative, {
      ...props,
      spec: Ref.make(Text.make(props.spec)),
      plan: Ref.make(Text.make(props.plan ?? '')),
      artifacts: props.artifacts ?? [],
      subscriptions: props.subscriptions ?? [],
    });
    yield* Database.add(initiative);
    const queue = yield* QueueService.createQueue<Message.Message | ContextBinding>();
    const contextBinder = new AiContextBinder({ queue });
    // TODO(dmaretskyi): Blueprint registry.
    const initiativeBlueprint = yield* Database.add(Obj.clone(makeBlueprint(), { deep: true }));
    yield* Effect.promise(() =>
      contextBinder.bind({
        blueprints: [Ref.make(initiativeBlueprint), ...(props.blueprints ?? [])],
        objects: [Ref.make(initiative), ...(props.contextObjects ?? [])],
      }),
    );
    const chat = yield* Database.add(
      Chat.make({
        queue: Ref.fromDXN(queue.dxn),
      }),
    );
    yield* Database.add(
      Relation.make(Chat.CompanionTo, {
        [Relation.Source]: chat,
        [Relation.Target]: initiative,
      }),
    );
    Obj.change(initiative, (initiative) => {
      initiative.chat = Ref.make(chat);
    });

    return initiative;
  });

export const resetChatHistory = (
  initiative: Initiative,
): Effect.Effect<void, ObjectNotFoundError, QueueService | Database.Service> =>
  Effect.gen(function* () {
    let blueprints: Ref.Ref<Blueprint.Blueprint>[] = [];
    let objects: Ref.Ref<Obj.Any>[] = [];
    if (initiative.chat) {
      const queue = yield* initiative.chat.pipe(Database.load).pipe(
        Effect.map((_) => _.queue),
        Effect.flatMap(Database.load),
      );
      const contextBinder = yield* acquireReleaseResource(
        () =>
          new AiContextBinder({
            queue,
          }),
      );
      blueprints.push(...contextBinder.getBlueprints().map((blueprint) => Ref.make(blueprint)));
      objects.push(...contextBinder.getObjects().map((object) => Ref.make(object)));
    } else {
      const initiativeBlueprint = yield* Database.add(Obj.clone(makeBlueprint(), { deep: true }));
      blueprints.push(Ref.make(initiativeBlueprint));
      objects.push(Ref.make(initiative));
    }

    const queue = yield* QueueService.createQueue();
    const contextBinder = new AiContextBinder({ queue });
    yield* Effect.promise(() =>
      contextBinder.bind({
        blueprints,
        objects,
      }),
    );
    const chat = yield* Database.add(
      Chat.make({
        queue: Ref.fromDXN(queue.dxn),
      }),
    );
    Obj.change(initiative, (initiative) => {
      initiative.chat = Ref.make(chat);
    });
    yield* Database.add(
      Relation.make(Chat.CompanionTo, {
        [Relation.Source]: chat,
        [Relation.Target]: initiative,
      }),
    );
  }).pipe(Effect.scoped);
