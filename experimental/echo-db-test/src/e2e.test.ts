//
// Copyright 2020 DXOS.org
//

import debug from 'debug';

import { Command } from '@dxos/echo-db-test/src/test-agent';
import { NodeOrchestrator, Platform, NodeHandle } from '@dxos/node-spawner';

const log = debug('dxos:echo:e2e:test');

async function invite (inviter: NodeHandle, invitee: NodeHandle) {
  inviter.sendEvent({
    command: Command.CREATE_PARTY
  });
  await inviter.log.waitFor(data => data.name === 'party');
  inviter.sendEvent({
    command: Command.CREATE_INVITATION
  });
  const { details: { invitation } } = await inviter.log.waitFor(data => data.name === 'invitation');
  log({ invitation });
  invitee.sendEvent({
    command: Command.JOIN_PARTY,
    invitation
  });
  await invitee.log.waitFor(data => data.name === 'joinParty');
}

test('create party', async () => {
  const orchestrator = new NodeOrchestrator();

  const node1 = await orchestrator.createNode(require.resolve('./test-agent'), Platform.IN_PROCESS);

  node1.metrics.update.on(() => {
    log('node1', node1.metrics.asObject());
  });

  node1.sendEvent({
    command: Command.CREATE_PARTY
  });

  await node1.metrics.update.waitFor(
    () => !!node1.metrics.getNumber('item.count') && node1.metrics.getNumber('item.count')! > 0);
  node1.snapshot();

  orchestrator.destroy();
});

test('replication from creator to invitee', async () => {
  const orchestrator = new NodeOrchestrator();

  const node1 = await orchestrator.createNode(require.resolve('./test-agent'), Platform.IN_PROCESS);
  const node2 = await orchestrator.createNode(require.resolve('./test-agent'), Platform.IN_PROCESS);

  node1.metrics.update.on(() => {
    log('node1 UPDATE:', node1.metrics.asObject());
  });
  node2.metrics.update.on(() => {
    log('node2 UPDATE:', node2.metrics.asObject());
  });

  node1.log.on(data => log('node1', data));
  node2.log.on(data => log('node2', data));

  await invite(node1, node2);
  log('invited');

  node1.sendEvent({ command: Command.CREATE_ITEM });

  await node1.metrics.update.waitFor(
    () => !!node1.metrics.getNumber('item.count') && node1.metrics.getNumber('item.count')! >= 2);
  log('node1 OK:', node1.metrics.asObject());
  await node2.metrics.update.waitFor(
    () => !!node2.metrics.getNumber('item.count') && node2.metrics.getNumber('item.count')! >= 2);
  log('node2 OK:', node1.metrics.asObject());

  node1.snapshot();
  node2.snapshot();

  orchestrator.destroy();
});

test('replication from invitee to creator', async () => {
  const orchestrator = new NodeOrchestrator();

  const node1 = await orchestrator.createNode(require.resolve('./test-agent'), Platform.IN_PROCESS);
  const node2 = await orchestrator.createNode(require.resolve('./test-agent'), Platform.IN_PROCESS);

  node1.metrics.update.on(() => {
    log('node1 UPDATE:', node1.metrics.asObject());
  });
  node2.metrics.update.on(() => {
    log('node2 UPDATE:', node2.metrics.asObject());
  });

  await invite(node1, node2);
  log('invited');

  const p2 = node2.metrics.update.waitFor(
    () => !!node2.metrics.getNumber('item.count') && node2.metrics.getNumber('item.count')! >= 2);
  const p1 = node1.metrics.update.waitFor(
    () => !!node1.metrics.getNumber('item.count') && node1.metrics.getNumber('item.count')! >= 2);

  node2.sendEvent({ command: Command.CREATE_ITEM });

  await p2;
  log('node2 OK:', node2.metrics.asObject());
  await p1;
  log('node1 OK:', node1.metrics.asObject());

  node1.snapshot();
  node2.snapshot();

  orchestrator.destroy();
});
