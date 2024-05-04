//
// Copyright 2024 DXOS.org
//

import args from 'args';

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { SignalingClient } from './client';

const TEST_SPACE_KEY = '4a138aed546a789b17ab702190a7f4382b2c92826247d1c7620287b49536666f';

const { prod, endpoint, port, identityKey } = args
  .option('prod', 'production mode', false)
  .option('endpoint', 'production endpoint', 'signaling.dxos.workers.dev')
  .option('port', 'dev server if not in prod mode', 8787)
  .option('identity-key', 'identity key', PublicKey.random().toHex())
  .parse(process.argv);

const url = prod ? `wss://${endpoint}}` : `ws://localhost:${port}`;

/**
 * Test peer.
 *
 * ```bash
 * npx ts-node ./src/client/test.ts
 * ```
 */
const main = async () => {
  const client = new SignalingClient(url);

  // Catch ctrl-c and safely close down.
  process.on('SIGINT', async () => {
    log.info('caught interrupt signal');
    await client.close();
    process.exit();
  });

  // TODO(burdon): Use hash of identity key.
  await client.open(PublicKey.from(identityKey));

  client.send({ type: 'join', data: { swarmKey: TEST_SPACE_KEY } });
};

void main();
