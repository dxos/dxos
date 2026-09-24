//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import type * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { meta } from '#meta';

import { ACCEPTED_MIME } from './FileLimits.ts';
import * as Settings from './Settings.ts';

/**
 * Descriptor for a registered `BlobBackend` storage option, surfaced in the file plugin's
 * settings UI. Actual upload/read logic lives in the Blob backend registered on the Hypergraph
 * under `storage` (see `client.graph.registerBlobBackend`) — this type carries no behavior.
 */
export type Backend = {
  /** Display label shown in the settings UI. */
  readonly name: string;
  /** Description shown next to the backend in settings. */
  readonly description?: string;
  /**
   * `Blob.fromBytes`'s `storage` option to use when this backend is selected. Also the settings
   * key identifying this backend — one `BlobBackend` is registered per storage name, so the two
   * concepts always coincide.
   */
  readonly storage: string;
};

// Multi capability: inline-backend and edge-backend each contribute one entry.
export const Backend = Capability.make<Backend>()(`${meta.profile.key}.capability.backend`);

export const SettingsAtom = Capability.makeSingleton<Atom.Writable<Settings.Settings>>()(
  `${meta.profile.key}.capability.settings`,
);

export namespace FileAction {
  export const UploadAnnotationId = `${meta.profile.key}.annotation.upload`;

  export const CreateFileSchema = Schema.Struct({
    file: Schema.instanceOf(File).annotate({
      [UploadAnnotationId]: ACCEPTED_MIME,
    }),
  });

  export type CreateFileForm = Schema.Schema.Type<typeof CreateFileSchema>;
}
