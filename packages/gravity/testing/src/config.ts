//
// Copyright 2020 DXOS.org
//

// TODO(egorgripasov): Factor out (use config from ~/.dx?).
export const CONFIG = {
  DX_SIGNAL_ENDPOINT: 'ws://localhost:4999',
  DX_ICE_ENDPOINTS: '[]',
  DX_WNS_ENDPOINT: 'https://wns1.kube.moon.dxos.network/api',
  DX_WNS_USER_KEY: undefined,
  DX_WNS_BOND_ID: undefined,
  DX_WNS_CHAIN_ID: 'devnet-2',
  DX_IPFS_SERVER: 'https://apollo1.kube.moon.dxos.network/dxos/ipfs/api',
  DX_IPFS_GATEWAY: 'https://apollo1.kube.moon.dxos.network/dxos/ipfs/gateway/'
};

export const FACTORY_OUT_DIR = './out';
export const FACTORY_BOT_DIR = '.bots';
