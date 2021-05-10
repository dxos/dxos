//
// Copyright 2020 DXOS.org
//

// TODO(egorgripasov): Factor out (use config from ~/.dx?).
export const CONFIG = {
  WIRE_SIGNAL_ENDPOINT: 'wss://apollo2.kube.moon.dxos.network/dxos/signal',
  WIRE_ICE_ENDPOINTS: '[{"urls":"stun:apollo1.kube.moon.dxos.network:3478"},{"urls":"turn:apollo1.kube.moon.dxos.network:3478","username":"dxos","credential":"dxos"},{"urls":"stun:apollo2.kube.moon.dxos.network:3478"},{"urls":"turn:apollo2.kube.moon.dxos.network:3478","username":"dxos","credential":"dxos"}]',
  WIRE_WNS_ENDPOINT: 'https://wns1.kube.moon.dxos.network/api',
  WIRE_WNS_USER_KEY: undefined,
  WIRE_WNS_BOND_ID: undefined,
  WIRE_WNS_CHAIN_ID: 'devnet-2',
  WIRE_IPFS_SERVER: 'https://apollo2.kube.moon.dxos.network/dxos/ipfs/api',
  WIRE_IPFS_GATEWAY: 'https://apollo2.kube.moon.dxos.network/dxos/ipfs/gateway/'
};

export const FACTORY_OUT_DIR = './out';
