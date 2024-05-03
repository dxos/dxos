//
// Copyright 2023 DXOS.org
//

import { type SchemaProvides } from '@braneframe/plugin-client';
import { type DocumentType } from '@braneframe/types';
import {
  type FileManagerProvides,
  type MetadataRecordsProvides,
  type SurfaceProvides,
  type TranslationsProvides,
} from '@dxos/app-framework';
import { type Extension } from '@codemirror/state';

import { WNFS_PLUGIN } from './meta';

const WNFS_ACTION = `${WNFS_PLUGIN}/action`;

export enum WnfsAction {
  CREATE = `${WNFS_ACTION}/create`,
}

export type WnfsPluginProvides = FileManagerProvides &
  SurfaceProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  SchemaProvides & {
    markdown: {
      extensions: (props: { document?: DocumentType }) => Extension[];
    };
  };
