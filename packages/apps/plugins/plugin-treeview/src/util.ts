//
// Copyright 2023 DXOS.org
//

export const uriToActive = (uri: string) => {
  const [_, pluginShortId, nodeId, ...rest] = uri.split('/');
  return pluginShortId && nodeId ? [`${pluginShortId}/${nodeId}`, ...rest] : pluginShortId ? [pluginShortId] : [];
};

export const activeToUri = (active: string[]) => '/' + active.join('/').split('/').map(encodeURIComponent).join('/');
