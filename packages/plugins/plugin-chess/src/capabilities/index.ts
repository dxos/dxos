//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as GameCapabilities from '@dxos/plugin-game/GameCapabilities';
import * as GameEvents from '@dxos/plugin-game/GameEvents';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const Schema = AppCapability.schema(() => import('./schema.ts'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition.ts'), {
  environments: ['node'],
});
// Browser-only: the variant descriptor carries the `card`/`article` React components the game
// host renders, so the module cannot load without a DOM.
export const GameVariant = Capability.lazyModule(
  'GameVariant',
  { provides: [GameCapabilities.VariantProvider], activatesOn: GameEvents.Start, environments: [] },
  () => import('./game-variant.ts'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export const Translations = AppCapability.translations(translations);
