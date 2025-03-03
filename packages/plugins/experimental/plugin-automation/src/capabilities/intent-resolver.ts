//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';
import { ObjectId } from '@dxos/echo-schema';
import { create, makeRef } from '@dxos/live-object';

import { AutomationAction, AIChatType } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: AutomationAction.CreateChat,
      resolve: ({ queue, name }) => ({
        data: {
          object: create(AIChatType, {
            name,
            // TODO(burdon): Pass in reference? Dima?
            queue: makeRef({ id: ObjectId.random() }),
            // queue: makeRefFromDXN(
            //   new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, spaceId, ObjectId.random()]).toString(),
            // ),
          }),
        },
      }),
    }),
  );
