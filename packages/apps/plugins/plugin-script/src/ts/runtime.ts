//
// Copyright 2024 DXOS.org
//

import {
  createDefaultMapFromCDN,
  createSystem,
  createVirtualTypeScriptEnvironment,
  type VirtualTypeScriptEnvironment,
} from '@typescript/vfs';
import ts, { type CompilerOptions, type System } from 'typescript';

import { Trigger } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

const rootFiles: string[] = [];

/**
 * Typescript VFS environment.
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
    this._fsMap = await createDefaultMapFromCDN(compilerOptions, ts.version, cache, ts);
    this._system = createSystem(this._fsMap);
    this._env = createVirtualTypeScriptEnvironment(this._system, rootFiles, ts, compilerOptions);
  }

  /**
   * Dynamically import typedefs from cdn.jsdelivr.net.
   * @param statement Import statement.
   */
  async loadImport(statement: string) {
    if (this._imports.has(statement)) {
      return;
    }

    this._imports.add(statement);
    const { setupTypeAcquisition } = await import('@typescript/ata');

    const trigger = new Trigger();

    const fetcher: typeof fetch = async (...props) => {
      try {
        return fetch(...props);
      } catch (err) {
        console.error('fetcher', err);
        return Response.error();
      }
    };

    // https://www.npmjs.com/package/@typescript/ata
    const ata = setupTypeAcquisition({
      projectName: 'dxos.org/app/composer',
      typescript: ts,
      logger: console,
      fetcher,
      delegate: {
        started: () => {
          log.info('started', { statement });
        },
        // TODO(burdon): Show progress/done in UI.
        receivedFile: (code, path) => {
          this._fsMap!.set(path, code);
        },
        progress: (downloaded, total) => {
          log('update', { downloaded, total });
        },
        finished: (vfs) => {
          log.info('finished', { statement, files: vfs.size });
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
      log.catch('failed to import types', { statement });
      this._imports.delete(statement);
    }
  }
}
