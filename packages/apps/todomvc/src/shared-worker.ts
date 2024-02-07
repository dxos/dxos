//
// Copyright 2024 DXOS.org
//

onconnect = async (event) => {
  // All worker code & imports have been moved behind an async import due to WASM + top-level await breaking the connect even somehow.
  // See: https://github.com/Menci/vite-plugin-wasm/issues/37
  const { onconnect } = await import('@dxos/react-client/worker');
  await onconnect(event);
};
