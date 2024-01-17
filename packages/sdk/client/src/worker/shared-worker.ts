//
// Copyright 2022 DXOS.org
//

// TODO(wittjosiah): This worker doesn't work with the Vite dev server outside of the monorepo.

onconnect = async (event) => {
  // All worker code & imports have been moved behind an async import due to WASM + top-level await breaking the connect even somehow.
  // See: https://github.com/Menci/vite-plugin-wasm/issues/37
  const { onconnect } = await import('./onconnect');
  await onconnect(event);
};
