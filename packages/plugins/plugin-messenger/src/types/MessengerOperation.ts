//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Obj, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';

export const Send = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.messenger.send'),
    name: 'Send Notification',
    description:
      "Sends a short notification to a contact's notifications panel, optionally linking to an object where the work lives.",
    icon: 'ph--paper-plane-tilt--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    recipientDid: Schema.String.annotate({ description: 'Identity DID of the recipient; must be a contact.' }),
    text: Schema.String.annotate({ description: 'Body of the notification.' }),
    subject: Schema.optional(Schema.String.annotate({ description: 'Short subject line.' })),
    link: Schema.optional(Ref.Ref(Obj.Unknown).annotate({ description: 'Object the notification points to.' })),
  }),
  output: Schema.Void,
});
