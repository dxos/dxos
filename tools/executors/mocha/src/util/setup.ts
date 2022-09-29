//
// Copyright 2022 DXOS.org
//

export const runSetup = async (scripts: string[]) => {
  console.log('Running setup scripts.');
  const before = Date.now();

  for (const script of scripts) {
    const { setup } = await import(script);
    await setup?.();
  }

  console.log(`Setup script finished in ${Date.now() - before} ms.`);
};
