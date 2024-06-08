//
// Copyright 2023 DXOS.org
//

import { type TunnelResponse } from '@dxos/protocols/proto/dxos/service/tunnel';

export const mapTunnels = (tunnels: TunnelResponse[]) => {
  return tunnels.map((tunnel) => ({
    key: tunnel.name,
    enabled: tunnel.enabled,
    url: tunnel.url,
  }));
};

export const printTunnels = (tunnels: TunnelResponse[], flags = {}) => {
  // ux.table(
  //   mapTunnels(tunnels),
  //   {
  //     key: {
  //       header: 'app',
  //     },
  //     enabled: {
  //       header: 'enabled',
  //     },
  //     url: {
  //       header: 'url',
  //     },
  //   },
  //   {
  //     ...flags,
  //   },
  // );
};
