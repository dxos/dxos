//
// Copyright 2023 DXOS.org
//

import { ux } from '@oclif/core';

import { type TableFlags, table } from '@dxos/cli-base';
import { type TunnelResponse } from '@dxos/protocols/proto/dxos/service/tunnel';

export const mapTunnels = (tunnels: TunnelResponse[]) =>
  tunnels.map((tunnel) => ({
    key: tunnel.name,
    enabled: tunnel.enabled,
    url: tunnel.url,
  }));

export const printTunnels = (tunnels: TunnelResponse[], flags: TableFlags = {}) => {
  ux.stdout(
    table(
      mapTunnels(tunnels),
      {
        key: {
          header: 'app',
        },
        enabled: {
          header: 'enabled',
        },
        url: {
          header: 'url',
        },
      },
      flags,
    ),
  );
};
