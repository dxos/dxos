//
// Copyright 2023 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';
import { type Context, createContext } from 'react';

import { Capability } from '@dxos/app-framework';

import { meta } from './meta';

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

export namespace PresenterCapabilities {
  export const Settings = Capability.make<Atom.Writable<PresenterSettingsProps>>(`${meta.id}.capability.settings`);
}
