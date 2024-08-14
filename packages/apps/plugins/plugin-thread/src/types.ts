//
// Copyright 2023 DXOS.org
//

import { type SchemaProvides } from '@braneframe/plugin-client';
import { type MarkdownExtensionProvides } from '@braneframe/plugin-markdown';
import { type ThreadType } from '@braneframe/types';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SettingsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';

import { THREAD_PLUGIN } from './meta';

const THREAD_ACTION = `${THREAD_PLUGIN}/action`;
export enum ThreadAction {
  CREATE = `${THREAD_ACTION}/create`,
  SELECT = `${THREAD_ACTION}/select`,
  DELETE = `${THREAD_ACTION}/delete`,
  TOGGLE_RESOLVED = `${THREAD_ACTION}/toggle-resolved`,
}

export type ThreadPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  SettingsProvides &
  TranslationsProvides &
  SchemaProvides &
  MarkdownExtensionProvides;

export type ThreadSettingsProps = { standalone?: boolean };

export interface ThreadModel {
  root: ThreadType;
}
