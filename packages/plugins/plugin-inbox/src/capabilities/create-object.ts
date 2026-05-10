//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { SpaceCapabilities } from '@dxos/plugin-space/types';
import { Event, Message } from '@dxos/types';

import { InboxOperation } from '#operations';
import { Calendar, Mailbox } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Mailbox.Mailbox.typename,
        inputSchema: Mailbox.CreateMailboxSchema,
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = Mailbox.make(props);
            return yield* Operation.invoke(InboxOperation.AddMailbox, {
              object,
              target: options.target,
            });
          }),
      }),
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Message.Message.typename,
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = Message.make({ sender: 'user' });
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Calendar.Calendar.typename,
        inputSchema: Calendar.CreateCalendarSchema,
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = Calendar.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Event.Event.typename,
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = Event.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
    ];
  }),
);
