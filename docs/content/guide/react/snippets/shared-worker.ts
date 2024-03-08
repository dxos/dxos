//
// Copyright 2024 DXOS.org
//

onconnect = async (event) => {
  const { onconnect } = await import('@dxos/react-client/worker');
  await onconnect(event);
};
