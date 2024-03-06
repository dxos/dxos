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
import lzstring from 'lz-string';
import ts, { type CompilerOptions, type System } from 'typescript';

import { Trigger } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

const rootFiles: string[] = [];

/**
 * Typescript VFS.
 */
export class TS {
  // TODO(burdon): Create persistent map (since types are cached in localStorage).
  private readonly _imports = new Set<string>();
  private _fsMap?: Map<string, string>;
  private _system?: System;
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

    // TODO(burdon): Not called.
    const fetcher: typeof fetch = async (...props) => {
      console.log('??', props);
      try {
        return fetch(...props);
      } catch (err) {
        console.log(err);
        return Response.error();
      }
    };

    this._fsMap = await createDefaultMapFromCDN(compilerOptions, ts.version, cache, ts, lzstring, fetcher);
    this._system = createSystem(this._fsMap);
    this._env = createVirtualTypeScriptEnvironment(this._system, rootFiles, ts, compilerOptions);
  }

  /**
   * Dynamically import typedefs.
   * @param statement Import statement.
   */
  async loadImport(statement: string) {
    if (this._imports.has(statement)) {
      return;
    }
    this._imports.add(statement);

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
          log.info('start', { statement });
        },
        // TODO(burdon): Show progress/done in UI.
        progress: (downloaded, total) => {
          log('update', { downloaded, total });
        },
        finished: (vfs) => {
          log.info('done', { statement, files: vfs.size });
          trigger.wake();
        },
        // TODO(burdon): Wrap fetch (Uncaught (in promise) TypeError: Failed to fetch).
        errorMessage: (error) => {
          log.catch(error);
        },
      },
    });

    try {
      ata(statement);
      await trigger.wait({ timeout: 30_000 });
    } catch (err) {
      log.catch(err);
      this._imports.delete(statement);
    }
  }
}
