//
// Copyright 2022 DXOS.org
//

export const runSetup = async (scripts: string[]) => {
  for (const script of scripts) {
    const { setup } = await import(script);
    await setup?.();
  }
};
