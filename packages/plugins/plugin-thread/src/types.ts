//
// Copyright 2023 DXOS.org
//

import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SettingsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { type SchemaProvides } from '@dxos/plugin-client';
import { type MarkdownExtensionProvides } from '@dxos/plugin-markdown';
import { type ThreadType } from '@dxos/plugin-space/types';

import { THREAD_PLUGIN } from './meta';

const THREAD_ACTION = `${THREAD_PLUGIN}/action`;
export enum ThreadAction {
  CREATE = `${THREAD_ACTION}/create`,
  SELECT = `${THREAD_ACTION}/select`,
  DELETE = `${THREAD_ACTION}/delete`,
  ON_MESSAGE_ADD = `${THREAD_ACTION}/on-message-add`,
  DELETE_MESSAGE = `${THREAD_ACTION}/delete-message`,
  TOGGLE_RESOLVED = `${THREAD_ACTION}/toggle-resolved`,
}

// TODO(Zan): Move this to the plugin-space plugin or another common location when we implement threads in sheets.
export type ThreadProvides<T> = {
  thread: {
    predicate: (obj: any) => obj is T;
    createSort: (obj: T) => (anchorA: string | undefined, anchorB: string | undefined) => number;
  };
};

export type ThreadPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  SettingsProvides<ThreadSettingsProps> &
  TranslationsProvides &
  SchemaProvides &
  MarkdownExtensionProvides;

export type ThreadSettingsProps = { standalone?: boolean };

export interface ThreadModel {
  root: ThreadType;
}

export type ThreadState = {
  /** In-memory draft threads. */
  drafts: Record<string, ThreadType[]>;
  current?: string | undefined;
};
