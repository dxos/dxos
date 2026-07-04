//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Blob, Database } from '@dxos/echo';

import { File, FileCapabilities, FileOperation, Settings, isAcceptedMimeType } from '../types';

export class UnsupportedFileTypeError extends Error {
  constructor(public readonly type: string) {
    super(`Unsupported file type: ${type}`);
    this.name = 'UnsupportedFileTypeError';
  }
}

export class FileTooLargeError extends Error {
  constructor(
    public readonly size: number,
    public readonly limit: number = Blob.MAX_INLINE_SIZE,
  ) {
    super(`File is too large: ${size} bytes (limit: ${limit} bytes)`);
    this.name = 'FileTooLargeError';
  }
}

export class NoBackendError extends Error {
  constructor() {
    super('No file storage backend is registered.');
    this.name = 'NoBackendError';
  }
}

export class FileReadError extends Error {
  constructor(cause: unknown) {
    super('Failed to read file contents.');
    this.name = 'FileReadError';
    this.cause = cause;
  }
}

/**
 * Resolves the storage name to force for an upload:
 * - the id the user explicitly configured in Settings.backend, if it matches a registered
 *   {@link FileCapabilities.Backend} descriptor
 * - otherwise `undefined`, leaving `File.fromBytes`'s `storage` option unset so it falls through
 *   to the Blob registry's own configured default (edge when configured, inline otherwise)
 *   instead of hardcoding `inline`
 *
 * Still requires at least one descriptor to be registered, as a sanity check that the plugin's
 * settings UI has something to show.
 */
export const resolveActiveStorage = Effect.gen(function* () {
  const backends = yield* Capability.getAll(FileCapabilities.Backend);
  if (backends.length === 0) {
    return yield* Effect.fail(new NoBackendError());
  }

  const settingsAtomOpt = yield* Capability.get(FileCapabilities.SettingsAtom).pipe(Effect.option);
  const registryOpt = yield* Capability.get(Capabilities.AtomRegistry).pipe(Effect.option);

  if (settingsAtomOpt._tag === 'Some' && registryOpt._tag === 'Some') {
    const settings = registryOpt.value.get(settingsAtomOpt.value) as Settings.Settings;
    if (settings.backend) {
      const match = backends.find((b) => b.id === settings.backend);
      if (match) {
        return match.storage;
      }
    }
  }

  return undefined;
});

const handler: Operation.WithHandler<typeof FileOperation.Create> = FileOperation.Create.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ file, db }) {
      // Validate before hitting the backend so the contract is consistent regardless of backend.
      if (!isAcceptedMimeType(file.type)) {
        return yield* Effect.fail(new UnsupportedFileTypeError(file.type));
      }
      const storage = yield* resolveActiveStorage;
      const bytes = new Uint8Array(
        yield* Effect.tryPromise({
          try: () => file.arrayBuffer(),
          catch: (error) => new FileReadError(error),
        }),
      );
      // The size cap only applies to `inline` storage — `Blob.fromBytes` enforces it internally;
      // other backends scale beyond it.
      const object = yield* File.fromBytes(bytes, {
        name: file.name,
        type: file.type,
        storage,
      }).pipe(
        Effect.provide(Database.layer(db)),
        Effect.catchTag('BlobTooLargeError', () => Effect.fail(new FileTooLargeError(bytes.byteLength))),
      );
      return { object };
    }),
  ),
);

export default handler;
