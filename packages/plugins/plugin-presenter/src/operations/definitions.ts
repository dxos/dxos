//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Collection } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { Markdown } from '@dxos/plugin-markdown/types';

import { meta } from '#meta';

const PRESENTER_OPERATION = `${meta.id}.operation`;

// TODO(wittjosiah): This appears to be unused.
export const TogglePresentation = Operation.make({
  meta: { key: `${PRESENTER_OPERATION}.toggle-presentation`, name: 'Toggle Presentation' },
  input: Schema.Struct({
    object: Schema.Union(Markdown.Document, Collection.Collection),
    state: Schema.optional(Schema.Boolean),
  }),
  output: Schema.Void,
});
