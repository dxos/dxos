//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Trace } from '@dxos/compute';
import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { trim } from '@dxos/util';

/**
 * Downloads an external image URL, uploads it to the DXOS image service, and
 * writes the returned canonical URL onto the subject's `image` field.
 * Mirrors the behaviour of composer-crx `createThumbnail`.
 */
export const AttachImage = Operation.make({
  meta: {
    key: 'org.dxos.function.plugin-crm.attach-image',
    name: 'Attach image',
    description: trim`
      Downloads an external image URL and stores it on the DXOS image service,
      then writes the canonical URL onto the subject's \`image\` field.
      Use this after you have already identified a candidate avatar, logo, or
      photograph for a Person or Organization via web research.
    `,
  },
  input: Schema.Struct({
    subject: Ref.Ref(Obj.Unknown).annotations({
      description: 'Reference to the Person or Organization whose `image` field should be set.',
    }),
    url: Schema.String.annotations({
      description: 'External image URL. Must be a JPEG, PNG, WebP, or GIF.',
    }),
    imageServiceUrl: Schema.optional(
      Schema.String.annotations({
        description: 'Override for the image service base URL. Defaults to the value configured for the runtime.',
      }),
    ),
  }),
  output: Schema.Struct({
    imageUrl: Schema.String.annotations({
      description: 'Canonical URL returned by the DXOS image service.',
    }),
  }),
  services: [Database.Service, Trace.TraceService],
});
