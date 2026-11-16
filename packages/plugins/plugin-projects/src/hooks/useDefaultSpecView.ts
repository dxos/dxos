//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';

import * as Hooks from '@dxos/app-framework/Hooks';

import { ProjectCapabilities, type Settings } from '#types';

const UNSET = Atom.make<Settings.Settings>({});

/** The view a spec opens in, from the projects plugin's settings; the forms when unset or outside the plugin. */
export const useDefaultSpecView = (): Settings.SpecView => {
  const [settings] = Hooks.useCapabilities(ProjectCapabilities.Settings);
  return useAtomValue(settings ?? UNSET).defaultSpecView ?? 'preview';
};
