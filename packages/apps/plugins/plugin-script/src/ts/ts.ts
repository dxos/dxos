//
// Copyright 2024 DXOS.org
//

import { createDefaultMapFromCDN, createSystem, createVirtualTypeScriptEnvironment } from '@typescript/vfs';
import ts from 'typescript';

export const createEnv = async (cache = true) => {
  const compilerOptions = {
    target: ts.ScriptTarget.ES2022,
  };

  const fsMap = await createDefaultMapFromCDN(compilerOptions, ts.version, cache, ts);
  const system = createSystem(fsMap);
  return createVirtualTypeScriptEnvironment(system, [], ts, compilerOptions);
};
