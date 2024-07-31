//
// Copyright 2024 DXOS.org
//

import {
  type GraphExporterProvides,
  type IntentResolverProvides,
  type SettingsProvides,
  type TranslationsProvides,
  type SurfaceProvides,
  type GraphSerializerProvides,
} from '@dxos/app-framework';

import { EXPORT_PLUGIN } from './meta';

const EXPORT_ACTION = `${EXPORT_PLUGIN}/action`;
export enum ExportAction {
  SELECT_ROOT = `${EXPORT_ACTION}/select-root`,
  EXPORT = `${EXPORT_ACTION}/export`,
}

export type ExportSettingsProps = {
  // General exporter settings.
  autoExport: boolean;
  autoExportInterval: number;

  // File exporter settings.
  rootHandle?: FileSystemDirectoryHandle;
};

export type ExportState = {
  running: boolean;
};

export type ExportPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphExporterProvides &
  GraphSerializerProvides &
  SettingsProvides<ExportSettingsProps> &
  TranslationsProvides & {
    export: Readonly<ExportState>;
  };
