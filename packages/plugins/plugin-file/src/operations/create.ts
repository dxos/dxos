//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';

import { File, FileCapabilities, FileOperation, MAX_FILE_SIZE, Settings, isAcceptedMimeType } from '../types';

export class UnsupportedFileTypeError extends Error {
  constructor(public readonly type: string) {
    super(`Unsupported file type: ${type}`);
    this.name = 'UnsupportedFileTypeError';
  }
}

export class FileTooLargeError extends Error {
  constructor(
    public readonly size: number,
    public readonly limit: number = MAX_FILE_SIZE,
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

/**
 * Resolve the configured {@link FileCapabilities.Backend} from the plugin
 * settings atom. Falls back to the inline backend (or the first registered
 * one) if the configured id is missing or settings aren't available.
 */
export const resolveActiveBackend = Effect.gen(function* () {
  const backends = yield* Capability.getAll(FileCapabilities.Backend);
  if (backends.length === 0) {
    return yield* Effect.fail(new NoBackendError());
  }

  const settingsAtomOpt = yield* Capability.get(FileCapabilities.SettingsAtom).pipe(Effect.option);
  const registryOpt = yield* Capability.get(Capabilities.AtomRegistry).pipe(Effect.option);

  if (settingsAtomOpt._tag === 'Some' && registryOpt._tag === 'Some') {
    const settings = registryOpt.value.get(settingsAtomOpt.value) as Settings.Settings;
    const id = settings.backend ?? Settings.DEFAULT_BACKEND_ID;
    const match = backends.find((b) => b.id === id);
    if (match) {
      return match;
    }
  }

  return backends.find((b) => b.id === Settings.DEFAULT_BACKEND_ID) ?? backends[0];
});

const handler: Operation.WithHandler<typeof FileOperation.Create> = FileOperation.Create.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ file, db }) {
      // Validate before hitting the backend so the contract is consistent regardless of backend.
      if (!isAcceptedMimeType(file.type)) {
        return yield* Effect.fail(new UnsupportedFileTypeError(file.type));
      }
      if (file.size > MAX_FILE_SIZE) {
        return yield* Effect.fail(new FileTooLargeError(file.size));
      }
      const backend = yield* resolveActiveBackend;
      const info = yield* Effect.promise(() => backend.upload(file, db));
      return {
        object: File.make({
          name: info.name,
          type: info.type,
          size: info.size,
          data: info.data,
          timestamp: new Date().toISOString(),
        }),
      };
    }),
  ),
);

export default handler;
