//
// Copyright 2024 DXOS.org
//

import WebSocket from 'ws';

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

//
// Test client.
//

const port = 9000;

const swarmKey = PublicKey.random();

// const ws = new WebSocket(`ws://localhost:${port}/signal/ws`);
const ws = new WebSocket('wss://labs-workers.dxos.workers.dev/signal/ws');

ws.on('error', (err) => log.catch(err));

ws.on('open', () => {
  ws.send(JSON.stringify({ action: 'ping' }));
});

ws.on('message', (data: Buffer) => {
  const message = JSON.parse(data.toString());
  log.info('received', { message });
  ws.close();
});
