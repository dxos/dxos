//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Blob, Database } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
import { File } from '@dxos/types';

import { FileCapabilities, FileLimits, FileOperation, Settings } from '#types';

export class UnsupportedFileTypeError extends BaseError.extend('UnsupportedFileTypeError') {
  constructor(public readonly type: string) {
    super({ message: `Unsupported file type: ${type}` });
  }
}

export class FileTooLargeError extends BaseError.extend('FileTooLargeError') {
  constructor(
    public readonly size: number,
    public readonly limit: number = Blob.MAX_INLINE_SIZE,
  ) {
    super({ message: `File is too large: ${size} bytes (limit: ${limit} bytes)` });
  }
}

export class NoBackendError extends BaseError.extend('NoBackendError', 'No file storage backend is registered.') {}

export class FileReadError extends BaseError.extend('FileReadError', 'Failed to read file contents.') {}

/**
 * Resolves the storage name to force for an upload:
 * - the storage name the user explicitly configured in Settings.backend, if it matches a
 *   registered {@link FileCapabilities.Backend} descriptor
 * - otherwise `undefined`, leaving `File.fromBytes`'s `storage` option unset so it falls through
 *   to the Blob registry's own configured default (edge when configured, inline otherwise)
 *   instead of hardcoding `inline`
 */
export const resolvePreferredStorage = Effect.gen(function* () {
  const backends = yield* Capability.getAll(FileCapabilities.Backend);
  if (backends.length === 0) {
    return undefined;
  }

  const settingsAtomOpt = yield* Capability.get(FileCapabilities.SettingsAtom).pipe(Effect.option);
  const registryOpt = yield* Capability.get(Capabilities.AtomRegistry).pipe(Effect.option);

  if (settingsAtomOpt._tag === 'Some' && registryOpt._tag === 'Some') {
    const settings = registryOpt.value.get(settingsAtomOpt.value) as Settings.Settings;
    if (settings.backend) {
      const match = backends.find((b) => b.storage === settings.backend);
      if (match) {
        return match.storage;
      }
    }
  }

  return undefined;
});

/**
 * {@link resolvePreferredStorage}, plus the settings-UI sanity check: a plugin host that registers
 * no {@link FileCapabilities.Backend} descriptor has nothing to show in settings, so the operation
 * says so rather than silently writing inline.
 *
 * Only for the path a person drives from the UI. A headless host registers no plugin capabilities
 * at all, so this check can never pass there and the operation resolves the preference directly.
 */
export const resolveActiveStorage = Effect.gen(function* () {
  const backends = yield* Capability.getAll(FileCapabilities.Backend);
  if (backends.length === 0) {
    return yield* Effect.fail(new NoBackendError());
  }

  return yield* resolvePreferredStorage;
});

const handler: Operation.WithHandler<typeof FileOperation.Create> = FileOperation.Create.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ file, db }) {
      // Validate before hitting the backend so the contract is consistent regardless of backend.
      if (!FileLimits.isAcceptedMimeType(file.type)) {
        return yield* Effect.fail(new UnsupportedFileTypeError(file.type));
      }
      const storage = yield* resolveActiveStorage;
      const bytes = new Uint8Array(
        yield* Effect.tryPromise({
          try: () => file.arrayBuffer(),
          catch: FileReadError.wrap(),
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
