//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as CanvasCapabilities from '@dxos/plugin-canvas/CanvasCapabilities';
import * as IllustratorEvents from '@dxos/plugin-illustrator/IllustratorEvents';

import { translations } from '#translations';

// Browser-only: the class shape carries a React view; it rides illustrator's start, as the canvas variant does.
export const ClassNodeType = Capability.lazyModule(
  'class-node-type',
  {
    provides: [CanvasCapabilities.NodeType],
    activatesOn: IllustratorEvents.Start,
    environments: ['browser', 'tauri'],
  },
  () => import('./class-node-type.ts'),
);
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition.ts'), {
  environments: ['browser', 'node', 'tauri'],
});
export const Translations = AppCapability.translations(translations);
