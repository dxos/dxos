//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';
import { type Database } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
// eslint-disable-next-line @dxos/rules/import-as-namespace
import { File as FileType } from '@dxos/types';

import { meta } from '#meta';

import * as Settings from './Settings';

/**
 * A file storage backend. Each backend ingests a File from the user and
 * returns the metadata + the {@link FileType.FileData} to attach to a
 * {@link FileType.File} object.
 */
export type Backend = {
  /** Stable backend id (e.g. 'inline', 'wnfs'). Used as the settings key. */
  readonly id: string;
  /** Display label shown in the settings UI. */
  readonly name: string;
  /** Description shown next to the backend in settings. */
  readonly description?: string;
  /** Upload a file. Throws on validation errors (size cap, unsupported MIME). */
  readonly upload: (file: File, db: Database.Database) => Promise<UploadResult>;
};

export type UploadResult = {
  readonly name: string;
  readonly type: string;
  readonly size: number;
  readonly data: FileType.FileData;
};

export const Backend = Capability.make<Backend>(`${meta.id}.capability.backend`);

/**
 * Resolves an external URL (e.g. `wnfs://…`) into a renderable URL (a
 * `blob:`, `data:`, or `http(s):` URL). Consumers iterate registered
 * resolvers and pick the first that returns true from {@link UrlResolver#test}.
 */
export type UrlResolver = {
  readonly id: string;
  readonly test: (url: string) => boolean;
  readonly resolve: (url: string, file: FileType.File, space?: Space) => Promise<string | undefined>;
};

export const UrlResolver = Capability.make<UrlResolver>(`${meta.id}.capability.url-resolver`);

export const SettingsAtom = Capability.make<Atom.Writable<Settings.Settings>>(`${meta.id}.capability.settings`);
