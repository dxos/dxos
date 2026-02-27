//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { SpaceSchema } from '@dxos/react-client/echo';
import { Collection } from '@dxos/schema';
import { Actor } from '@dxos/types';

import { meta } from '../meta';

const INBOX_OPERATION = `${meta.id}/operation`;

export namespace InboxOperation {
  export const OnCreateSpace = Operation.make({
    meta: { key: `${INBOX_OPERATION}/on-create-space`, name: 'On Create Space' },
    services: [Capability.Service],
    schema: {
      input: Schema.Struct({
        space: SpaceSchema,
        rootCollection: Collection.Collection,
        isDefault: Schema.optional(Schema.Boolean),
      }),
      output: Schema.Void,
    },
  });

  export const ExtractContact = Operation.make({
    meta: { key: `${INBOX_OPERATION}/extract-contact`, name: 'Extract Contact' },
    services: [Capability.Service],
    schema: {
      input: Schema.Struct({
        db: Database.Database,
        actor: Actor.Actor,
      }),
      output: Schema.Void,
    },
  });

  export const CreateDraft = Operation.make({
    meta: { key: `${INBOX_OPERATION}/create-draft`, name: 'Create Draft' },
    services: [Capability.Service],
    schema: {
      input: Schema.Struct({
        db: Database.Database,
        mode: Schema.optional(Schema.Literal('compose', 'reply', 'reply-all', 'forward')),
        replyToMessage: Schema.optional(Schema.Any),
        subject: Schema.optional(Schema.String),
        body: Schema.optional(Schema.String),
      }),
      output: Schema.Void,
    },
  });
}
