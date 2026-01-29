import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { AiContextBinder, type ContextBinding } from '@dxos/assistant';
import { Blueprint, Template } from '@dxos/blueprints';
import { Database, Obj, Ref, Relation, Type } from '@dxos/echo';
import { QueueService } from '@dxos/functions';
import { Text } from '@dxos/schema';
import type { Message } from '@dxos/types';
import { trim } from '@dxos/util';

import * as Chat from '../chat/Chat';
import { agent, getContext, update } from './functions';
import { makeBlueprint } from './blueprint';
import { Initiative, PLAN_ARTIFACT_NAME, SPEC_ARTIFACT_NAME } from './Initiative';

export const makeInitialized = (
  props: Omit<Obj.MakeProps<typeof Initiative>, 'artifacts' | 'chat'> &
    Partial<Pick<Obj.MakeProps<typeof Initiative>, 'artifacts'>> & {
      spec: string;
      plan?: string;
      blueprints?: Ref.Ref<Blueprint.Blueprint>[];
      contextObjects?: Ref.Ref<Obj.Any>[];
    },
): Effect.Effect<Initiative, never, QueueService | Database.Service> =>
  Effect.gen(function* () {
    const initiative = Obj.make(Initiative, {
      ...props,
      artifacts: [
        {
          name: SPEC_ARTIFACT_NAME,
          data: Ref.make(Text.make(props.spec)),
        },
        {
          name: PLAN_ARTIFACT_NAME,
          data: Ref.make(Text.make(props.plan ?? '')),
        },
        ...(props.artifacts ?? []),
      ],
    });
    yield* Database.Service.add(initiative);
    const queue = yield* QueueService.createQueue<Message.Message | ContextBinding>();
    const contextBinder = new AiContextBinder({ queue });
    const initiativeBlueprint = yield* Database.Service.add(Obj.clone(makeBlueprint(), { deep: true }));
    yield* Effect.promise(() =>
      contextBinder.bind({
        blueprints: [Ref.make(initiativeBlueprint), ...(props.blueprints ?? [])],
        objects: [Ref.make(initiative), ...(props.contextObjects ?? [])],
      }),
    );
    const chat = yield* Database.Service.add(
      Chat.make({
        queue: Ref.fromDXN(queue.dxn),
      }),
    );
    yield* Database.Service.add(
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
