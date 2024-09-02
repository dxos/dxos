//
// Copyright 2023 DXOS.org
//

import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  SettingsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';

import { GPT_PLUGIN } from './meta';

const GPT_ACTION = `${GPT_PLUGIN}/action`;

export enum GptAction {
  ANALYZE = `${GPT_ACTION}/analyze`,
}

export type GptSettingsProps = {
  apiKey?: string;
};

export type GptPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  SettingsProvides<GptSettingsProps> &
  TranslationsProvides;
