//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';
import { type Context, createContext } from 'react';

import { Operation } from '@dxos/operation';
import { Markdown } from '@dxos/plugin-markdown/types';
import { Collection } from '@dxos/schema';

import { meta } from './meta';

const PRESENTER_OPERATION = `${meta.id}/operation`;

// TODO(wittjosiah): This appears to be unused.
export namespace PresenterOperation {
  export const TogglePresentation = Operation.make({
    meta: { key: `${PRESENTER_OPERATION}/toggle-presentation`, name: 'Toggle Presentation' },
    schema: {
      input: Schema.Struct({
        object: Schema.Union(Markdown.Document, Collection.Collection),
        state: Schema.optional(Schema.Boolean),
      }),
      output: Schema.Void,
    },
  });
}

export type PresenterContextType = {
  running: boolean;
  start: () => void;
  stop: () => void;
};

export const PresenterContext: Context<PresenterContextType> = createContext<PresenterContextType>({
  running: false,
  start: () => {},
  stop: () => {},
});

export const PresenterSettingsSchema = Schema.mutable(
  Schema.Struct({
    presentCollections: Schema.optional(Schema.Boolean),
  }),
);

export type PresenterSettingsProps = Schema.Schema.Type<typeof PresenterSettingsSchema>;
