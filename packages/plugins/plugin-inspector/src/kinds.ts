//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import type * as Capability from '@dxos/app-framework/Capability';
import type * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';

export type KindId = 'app-graph' | 'create-object' | 'operations' | 'schema' | 'skill' | 'surface' | 'translations';

export type Kind = { id: KindId; label: string; capability: Capability.InterfaceDef<any> };

/** The kinds of module the inspector shows, in the order the learning path adds them. */
export const KINDS: readonly Kind[] = [
  { id: 'translations', label: 'Translations', capability: AppCapabilities.Translations },
  { id: 'schema', label: 'Schema', capability: AppCapabilities.Schema },
  { id: 'create-object', label: 'Create object', capability: SpaceCapabilities.CreateObjectEntry },
  { id: 'surface', label: 'Surface', capability: Capabilities.ReactSurface },
  { id: 'operations', label: 'Operations', capability: Capabilities.OperationHandler },
  { id: 'skill', label: 'Skill', capability: AppCapabilities.SkillDefinition },
  { id: 'app-graph', label: 'App graph', capability: AppCapabilities.AppGraphBuilder },
];

/** The kind of a module, by the first capability it provides that the inspector knows. */
export const kindOf = (module: Plugin.PluginModule): Kind | undefined =>
  KINDS.find((kind) => module.activation.provides.some((tag) => tag.identifier === kind.capability.identifier));
