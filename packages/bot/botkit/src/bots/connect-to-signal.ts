//
// Copyright 2021 DXOS.org
//

import { PublicKey } from '@dxos/crypto';
import { WebsocketSignalManager } from '@dxos/network-manager';

void (async () => {
  const onOffer = async () => ({ accept: true });
  const signal = new WebsocketSignalManager(['ws://localhost:4000'], onOffer);
  signal.join(PublicKey.random(), PublicKey.random());
})();
