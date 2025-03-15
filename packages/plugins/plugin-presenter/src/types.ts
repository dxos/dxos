//
// Copyright 2023 DXOS.org
//

import { type Context, createContext } from 'react';

import { S } from '@dxos/echo-schema';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { CollectionType } from '@dxos/plugin-space/types';

import { PRESENTER_PLUGIN } from './meta';

export namespace PresenterAction {
  const PRESENTER_ACTION = `${PRESENTER_PLUGIN}/action`;

  export class TogglePresentation extends S.TaggedClass<TogglePresentation>()(
    `${PRESENTER_ACTION}/toggle-presentation`,
    {
      input: S.Struct({
        object: S.Union(DocumentType, CollectionType),
        state: S.optional(S.Boolean),
      }),
      output: S.Void,
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

export const PresenterSettingsSchema = S.mutable(
  S.Struct({
    presentCollections: S.optional(S.Boolean),
  }),
);

export type PresenterSettingsProps = S.Schema.Type<typeof PresenterSettingsSchema>;
