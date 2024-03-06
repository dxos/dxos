//
// Copyright 2024 DXOS.org
//

import { createDefaultMapFromCDN, createSystem, createVirtualTypeScriptEnvironment } from '@typescript/vfs';
import ts, { type CompilerOptions } from 'typescript';

export const createEnv = async (cache = true) => {
  const compilerOptions: CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
  };

  const fsMap = await createDefaultMapFromCDN(compilerOptions, ts.version, cache, ts);

  // TODO(burdon): ???
  fsMap.set('index.ts', 'import * as S from "@effect/schema/Schema";\n');

  const system = createSystem(fsMap);
  return createVirtualTypeScriptEnvironment(system, [], ts, compilerOptions);
};
