//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import type { Capability } from '@dxos/app-framework';
import { Capabilities } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { Reconnect } from './definitions';

import { FileCapabilities } from '../types';
import { getDirectoryChildren } from '../util';

export default Reconnect.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ id }) {
      const state = yield* Capabilities.getAtomValue(FileCapabilities.State);
      const entity = state.files.find((entity) => entity.id === id);
      if (!entity) {
        return;
      }

      if ('children' in entity) {
        const permission = yield* Effect.promise(async () =>
          (entity.handle as any).requestPermission({ mode: 'readwrite' }),
        );
        if (permission === 'granted') {
          const children = yield* Effect.promise(async () =>
            getDirectoryChildren(entity.handle, entity.handle.name),
          );
          yield* Capabilities.updateAtomValue(FileCapabilities.State, (current) => ({
            ...current,
            files: current.files.map((f) =>
              f.id === id ? { ...f, children, permission } : f,
            ) as typeof current.files,
          }));
        }
      } else {
        const permission = yield* Effect.promise(async () =>
          (entity.handle as any)?.requestPermission({ mode: 'readwrite' }),
        );
        if (permission === 'granted') {
          const text = yield* Effect.promise(async () =>
            (entity.handle as any).getFile?.().then((file: any) => file.text()),
          );
          yield* Capabilities.updateAtomValue(FileCapabilities.State, (current) => ({
            ...current,
            files: current.files.map((f) => (f.id === id ? { ...f, text, permission } : f)) as typeof current.files,
          }));
        }
      }
    }),
  ),
);
