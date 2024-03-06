//
// Copyright 2024 DXOS.org
//

import { setupTypeAcquisition } from '@typescript/ata';
import {
  createDefaultMapFromCDN,
  createSystem,
  createVirtualTypeScriptEnvironment,
  type VirtualTypeScriptEnvironment,
} from '@typescript/vfs';
import ts, { type CompilerOptions } from 'typescript';

import { Trigger } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

/**
 * Typescript VFS.
 */
export class TS {
  private _imports = new Set<string>();
  private _fsMap?: Map<string, string>;
  private _env?: VirtualTypeScriptEnvironment;

  get env() {
    invariant(this._env);
    return this._env!;
  }

  async initialize(
    compilerOptions: CompilerOptions = {
      target: ts.ScriptTarget.ES2022,
    },
  ) {
    const cache = typeof localStorage !== 'undefined';
    this._fsMap = await createDefaultMapFromCDN(compilerOptions, ts.version, cache, ts);

    const system = createSystem(this._fsMap);
    this._env = createVirtualTypeScriptEnvironment(system, [], ts, compilerOptions);
  }

  /**
   * Dynamically import typedefs.
   * @param statement
   */
  async import(statement: string) {
    if (this._imports.has(statement)) {
      return;
    }

    const trigger = new Trigger();

    // https://www.npmjs.com/package/@typescript/ata
    const ata = setupTypeAcquisition({
      projectName: 'Test',
      typescript: ts,
      logger: console,
      delegate: {
        receivedFile: (code, path) => {
          this._fsMap!.set(path, code);
          log('received', { path });
        },
        started: () => {
          log('start', { statement });
        },
        // TODO(burdon): Show progress/done in UI.
        progress: (downloaded, total) => {
          log('update', { downloaded, total });
        },
        finished: (vfs) => {
          log('done', { statement, files: vfs.size });
          trigger.wake();
        },
      },
    });

    ata(statement);
    await trigger.wait();
    this._imports.add(statement);
  }
}
