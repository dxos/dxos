//
// Copyright 2023 DXOS.org
//

import type { StackProvides } from '@braneframe/plugin-stack';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';

export const SCRIPT_PLUGIN = 'dxos.org/plugin/script';

export enum ScriptAction {
  CREATE = `${SCRIPT_PLUGIN}/create`,
}

export type ScriptPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  TranslationsProvides &
  StackProvides;
