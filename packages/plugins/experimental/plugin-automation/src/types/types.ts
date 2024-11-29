//
// Copyright 2023 DXOS.org
//

import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { type SchemaProvides } from '@dxos/plugin-space';
import { type PanelProvides } from '@dxos/plugin-deck/types';

import { AUTOMATION_PLUGIN } from '../meta';

const AUTOMATION_ACTION = `${AUTOMATION_PLUGIN}/action`;

export enum AutomationAction {
  CREATE = `${AUTOMATION_ACTION}/create`,
}

export type AutomationPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  GraphBuilderProvides &
  SchemaProvides &
  PanelProvides;
