//
// Copyright 2023 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import { type Context, createContext } from 'react';

import { Capability } from '@dxos/app-framework';

import { meta } from '../meta';

import { type PresenterSettingsProps } from './Settings';

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

export { PresenterSettingsSchema, type PresenterSettingsProps } from './Settings';

export namespace PresenterCapabilities {
  export const Settings = Capability.make<Atom.Writable<PresenterSettingsProps>>(`${meta.id}.capability.settings`);
}
