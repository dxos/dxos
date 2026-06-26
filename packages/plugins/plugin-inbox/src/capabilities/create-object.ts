//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { Event, Message } from '@dxos/types';

import { InboxOperation } from '#types';
import { Calendar, Mailbox } from '#types';

import { getCalendarsPath } from '../paths';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Mailbox.Mailbox),
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
        id: Type.getTypename(Message.Message),
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = Message.make({ sender: 'user' });
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Calendar.Calendar),
        inputSchema: Calendar.CreateCalendarSchema,
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = Calendar.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              targetNodeId: options.targetNodeId ?? getCalendarsPath(options.db.spaceId),
            });
          }),
      }),
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Event.Event),
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = Event.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
    ];
  }),
);
