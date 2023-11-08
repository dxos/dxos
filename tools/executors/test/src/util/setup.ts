//
// Copyright 2022 DXOS.org
//

export const runSetup = async ({ script, options = {} }: { script: string; options?: Record<string, any> }) => {
  // console.log('Running setup script.', { path: script, options });
  const before = Date.now();

  const { setup } = await import(script);
  await setup?.(options);

  console.log(`Setup script finished in ${Date.now() - before} ms.`);
};
