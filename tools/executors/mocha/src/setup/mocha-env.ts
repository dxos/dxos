//
// Copyright 2022 DXOS.org
//

export const setup = async () => {
  (globalThis as any).mochaExecutor = { environment: 'nodejs' };
};
