//
// Copyright 2022 DXOS.org
//

export const runSetup = async (script: string) => {
  console.log('Running setup script.');
  const before = Date.now();

  const { setup } = await import(script);
  await setup?.();

  console.log(`Setup script finished in ${Date.now() - before} ms.`);
};
