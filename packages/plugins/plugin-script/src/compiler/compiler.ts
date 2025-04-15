//
// Copyright 2024 DXOS.org
//

import {
  createDefaultMapFromCDN,
  createSystem,
  createVirtualTypeScriptEnvironment,
  type VirtualTypeScriptEnvironment,
} from '@typescript/vfs';
import ts from 'typescript';

import { invariant } from '@dxos/invariant';

const defaultOptions: ts.CompilerOptions = {
  lib: ['DOM', 'es2022'],
  target: ts.ScriptTarget.ES2022,
};

export class Compiler {
  private _env: VirtualTypeScriptEnvironment | undefined;
  private _fsMap: Map<string, string> | undefined;

  constructor(private readonly _options: ts.CompilerOptions = defaultOptions) {}

  async initialize() {
    if (this._env) {
      return;
    }

    // TODO(wittjosiah): Figure out how to get workers working in plugin packages.
    //   https://github.com/val-town/codemirror-ts?tab=readme-ov-file#setup-worker
    this._fsMap = await createDefaultMapFromCDN(this._options, '5.5.4', true, ts);
    const system = createSystem(this._fsMap);
    this._env = createVirtualTypeScriptEnvironment(system, [], ts, this._options);
  }

  get environment() {
    invariant(this._env, 'Compiler environment not initialized.');
    return this._env;
  }

  setFile(fileName: string, content: string) {
    invariant(this._fsMap, 'File system map not initialized.');
    this.environment.createFile(fileName, content);
  }

  compile(fileName: string) {
    return this.environment.languageService.getEmitOutput(fileName);
  }
}
