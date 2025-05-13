//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';
import { type Context, createContext } from 'react';

import { DocumentType } from '@dxos/plugin-markdown/types';
import { CollectionType } from '@dxos/plugin-space/types';

import { PRESENTER_PLUGIN } from './meta';

export namespace PresenterAction {
  const PRESENTER_ACTION = `${PRESENTER_PLUGIN}/action`;

  export class TogglePresentation extends Schema.TaggedClass<TogglePresentation>()(
    `${PRESENTER_ACTION}/toggle-presentation`,
    {
      input: Schema.Struct({
        object: Schema.Union(DocumentType, CollectionType),
        state: Schema.optional(Schema.Boolean),
      }),
      output: Schema.Void,
    },
  ) {}
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
