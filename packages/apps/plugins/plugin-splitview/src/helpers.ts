//
// Copyright 2023 DXOS.org
//

export const uriToActive = (uri: string) => {
  const [_, ...nodeId] = uri.split('/');
  return nodeId ? nodeId.join(':') : undefined;
};

export const activeToUri = (active?: string) =>
  '/' + (active ? active.split(':').map(encodeURIComponent).join('/') : '');
