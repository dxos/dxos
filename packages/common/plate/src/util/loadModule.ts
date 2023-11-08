//
// Copyright 2022 DXOS.org
//

import * as tsnode from 'ts-node';

export const isCodeModule = (file: string) => /\.[tj]sx?$/.test(file);

export type LoadModuleOptions = {
  compilerOptions?: any;
  moduleLoaderFunction?: (m: string) => any;
};

let tsnodeRegistered = false;

export const loadModule = async (p: string, options?: LoadModuleOptions) => {
  if (!isCodeModule(p)) {
    throw new Error(`only ts or js files can be loaded. attempted: ${p}`);
  }

  const esm = options?.compilerOptions?.module === 'esnext';

  if (/\.tsx?$/.test(p) && !tsnodeRegistered) {
    const r = {
      transpileOnly: true,
      swc: false,
      skipIgnore: true,
      esm,
      compilerOptions: {
        strict: false,
        target: 'es5',
        module: 'commonjs',
        ...options?.compilerOptions,
      },
    };
    tsnode.register(r);
    tsnodeRegistered = true;
  }
  const loader = options?.moduleLoaderFunction ?? ((m: string) => require(m));
  try {
    return loader(p);
  } catch (err: any) {
    console.error('problem loading template ' + p);
    console.error(err);
    throw err;
  }
};

export const safeLoadModule = async (p: string, options?: LoadModuleOptions) => {
  try {
    return {
      module: await loadModule(p, options),
      success: true,
    };
  } catch (err) {
    return { error: err, success: false };
  }
};
