//
// Copyright 2023 DXOS.org
//

import { type Context, createContext } from 'react';

import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  SettingsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
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

export type PresenterSettingsProps = {
  presentCollections?: boolean;
};

export type PresenterPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  TranslationsProvides &
  SettingsProvides<PresenterSettingsProps>;
