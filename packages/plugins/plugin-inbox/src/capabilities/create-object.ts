//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Type } from '@dxos/echo';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { Event, Message } from '@dxos/types';

import { Calendar, InboxOperation, Mailbox } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributeAll(SpaceCapabilities.CreateObjectEntry, [
        {
          id: Type.getTypename(Mailbox.Mailbox),
          inputSchema: Mailbox.CreateMailboxSchema,
          createObject: (props, options) =>
            Effect.gen(function* () {
              const object = Mailbox.make(props);
              return yield* Operation.invoke(
                InboxOperation.AddMailbox,
                { object, target: options.target },
                { spaceId: options.db.spaceId },
              );
            }),
        },
        {
          id: Type.getTypename(Message.Message),
          createObject: (props, options) =>
            Effect.gen(function* () {
              const object = Message.make({ sender: 'user' });
              return yield* Operation.invoke(
                SpaceOperation.AddObject,
                {
                  object,
                  target: options.target,
                },
                { spaceId: options.db.spaceId },
              );
            }),
        },
        {
          id: Type.getTypename(Calendar.Calendar),
          inputSchema: Calendar.CreateCalendarSchema,
          createObject: (props, options) =>
            Effect.gen(function* () {
              const object = Calendar.make(props);
              return yield* Operation.invoke(
                SpaceOperation.AddObject,
                {
                  object,
                  target: options.target,
                },
                { spaceId: options.db.spaceId },
              );
            }),
        },
        {
          id: Type.getTypename(Event.Event),
          createObject: (props, options) =>
            Effect.gen(function* () {
              const object = Event.make(props);
              return yield* Operation.invoke(
                SpaceOperation.AddObject,
                {
                  object,
                  target: options.target,
                },
                { spaceId: options.db.spaceId },
              );
            }),
        },
      ]),
    ];
  }),
);
