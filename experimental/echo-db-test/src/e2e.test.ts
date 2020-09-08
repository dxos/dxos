//
// Copyright 2020 DXOS.org
//

import debug from 'debug';

import { NodeOrchestrator, Platform, NodeHandle } from '@dxos/node-spawner';

const log = debug('dxos:echo:e2e:test');

async function invite (inviter: NodeHandle, invitee: NodeHandle) {
  inviter.sendEvent({
    command: 'CREATE_PARTY'
  });
  const { details: invitation } = await inviter.log.waitFor(data => data.name === 'invitation');
  log({ invitation });
  invitee.sendEvent({
    command: 'ACCEPT_INVITATION',
    invitation
  });
  const { details: invitationResponse } = await invitee.log.waitFor(data => data.name === 'invitationResponse');
  log({ invitationResponse });
  inviter.sendEvent({
    command: 'FINALIZE_INVITATION',
    invitationResponse
  });
}

test('replication', async () => {
  const orchestrator = new NodeOrchestrator();

  const node1 = await orchestrator.createNode(require.resolve('./test-agent'), Platform.IN_PROCESS);
  const node2 = await orchestrator.createNode(require.resolve('./test-agent'), Platform.IN_PROCESS);

  node1.metrics.update.on(() => {
    log('node1', node1.metrics.asObject());
  });
  node2.metrics.update.on(() => {
    log('node2', node2.metrics.asObject());
  });

  await invite(node1, node2);
  log('invited');

  node1.sendEvent({});

  await node1.metrics.update.waitFor(
    () => !!node1.metrics.getNumber('item.count') && node1.metrics.getNumber('item.count')! >= 2);
  log('node1 has items');
  await node2.metrics.update.waitFor(
    () => !!node2.metrics.getNumber('item.count') && node2.metrics.getNumber('item.count')! >= 2);
  log('node2 has items');

  node1.snapshot();
  node2.snapshot();

  orchestrator.destroy();
});

test('create party', async () => {
  const orchestrator = new NodeOrchestrator();

  const node1 = await orchestrator.createNode(require.resolve('./test-agent'), Platform.IN_PROCESS);

  node1.metrics.update.on(() => {
    log('node1', node1.metrics.asObject());
  });

  node1.sendEvent({
    command: 'CREATE_PARTY'
  });

  await node1.metrics.update.waitFor(
    () => !!node1.metrics.getNumber('item.count') && node1.metrics.getNumber('item.count')! > 0);
  node1.snapshot();

  orchestrator.destroy();
});
