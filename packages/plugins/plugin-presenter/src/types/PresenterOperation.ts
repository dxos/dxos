//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Collection, DXN } from '@dxos/echo';
import { Markdown } from '@dxos/plugin-markdown';

import { meta } from '#meta';

const PRESENTER_OPERATION = `${DXN.getName(meta.id)}.operation`;

// TODO(wittjosiah): This appears to be unused.
export const TogglePresentation = Operation.make({
  meta: {
    key: DXN.make(`${PRESENTER_OPERATION}.togglePresentation`),
    name: 'Toggle Presentation',
    icon: 'ph--presentation--regular',
  },
  input: Schema.Struct({
    object: Schema.Union(Markdown.Document, Collection.Collection),
    state: Schema.optional(Schema.Boolean),
  }),
  output: Schema.Void,
});
