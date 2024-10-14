//
// Copyright 2024 DXOS.org
//

export const getEdgeUrlWithProtocol = (baseUrl: string, protocol: 'http' | 'ws') => {
  const isSecure = baseUrl.startsWith('https') || baseUrl.startsWith('wss');
  const url = new URL(baseUrl);
  url.protocol = protocol + (isSecure ? 's' : '');
  return url.toString();
};
