//
// Copyright 2023 DXOS.org
//

import {
  type FileManagerProvides,
  type MetadataRecordsProvides,
  type SurfaceProvides,
  type TranslationsProvides,
} from '@dxos/app-framework';
import { type SchemaProvides } from '@dxos/plugin-space';
import { type MarkdownExtensionProvides } from '@dxos/plugin-markdown/types';

import { WNFS_PLUGIN } from '../meta';

const WNFS_ACTION = `${WNFS_PLUGIN}/action`;

export enum WnfsAction {
  CREATE = `${WNFS_ACTION}/create`,
}

export type WnfsPluginProvides = FileManagerProvides &
  SurfaceProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  SchemaProvides &
  MarkdownExtensionProvides;
