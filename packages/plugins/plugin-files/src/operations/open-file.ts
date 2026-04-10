//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Trigger } from '@dxos/async';
import { Operation } from '@dxos/operation';

import { FileCapabilities } from '../types';
import { handleToLocalFile, legacyFileToLocalFile } from '../util';
import { OpenFile } from './definitions';

const handler: Operation.WithHandler<typeof OpenFile> = OpenFile.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      if ('showOpenFilePicker' in window) {
        const [handle]: FileSystemFileHandle[] = yield* Effect.promise(async () =>
          (window as any).showOpenFilePicker({
            mode: 'readwrite',
            types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }],
          }),
        );
        const file = yield* Effect.promise(async () => handleToLocalFile(handle));
        yield* Capabilities.updateAtomValue(FileCapabilities.State, (current) => ({
          ...current,
          files: [...current.files, file],
        }));
        return { id: file.id, subject: [file.id] };
      }

      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const stateAtom = yield* Capability.get(FileCapabilities.State);
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.md,text/markdown';
      const result = new Trigger<string>();
      input.onchange = async () => {
        const [legacyFile] = input.files ? Array.from(input.files) : [];
        if (legacyFile) {
          const file = await legacyFileToLocalFile(legacyFile);
          registry.update(stateAtom, (current) => ({ ...current, files: [...current.files, file] }));
          result.wake(file.id);
        }
      };
      input.click();
      const id = yield* Effect.promise(async () => result.wait());
      return { id, subject: [id] };
    }),
  ),
);

export default handler;
