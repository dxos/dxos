//
// Copyright 2021 DXOS.org
//

import { PeerMap } from './peer-map';

const bf = str => Buffer.from(str);

test('basic operations', () => {
  const map = new PeerMap(bf('owner1'));

  const onAdd = jest.fn();
  const onDel = jest.fn();

  map.on('peer-added', onAdd);
  map.on('peer-deleted', onDel);

  expect(map.peers.length).toBe(0);

  map.add({ id: bf('peer1'), topic: bf('topic1'), rpc: {} });
  map.add({ id: bf('peer2'), topic: bf('topic1'), rpc: {} });
  map.add({ id: bf('peer3'), topic: bf('topic2'), rpc: {} });
  map.add({ id: bf('peer4'), topic: bf('topic3'), rpc: {} });
  map.add({ id: bf('peer5'), topic: bf('topic3'), rpc: {} });

  expect(map.peers.length).toBe(5);
  expect(map.topics.length).toBe(3);

  expect(map.delete(bf('topic3'), bf('peer4'))).toBe(true);
  expect(map.delete(bf('topic3'), bf('peer5'))).toBe(true);

  // delete false
  expect(map.delete(bf('topicx'), bf('peer6'))).toBe(false);
  expect(map.delete(bf('topic2'), bf('peerx'))).toBe(false);

  expect(map.peers.length).toBe(3);
  expect(map.topics.length).toBe(2);

  expect(onAdd).toHaveBeenCalledTimes(5);
  expect(onDel).toHaveBeenCalledTimes(2);

  expect(map.getPeersByTopic(bf('topic2')).length).toBe(1);

  map.updatePeersByOwner(bf('owner2'), [
    { id: bf('peer6'), topic: bf('topic1') },
    { id: bf('peer7'), topic: bf('topic2') }
  ]);

  expect(map.peers.length).toBe(5);
  expect(map.topics.length).toBe(2);

  map.updatePeersByOwner(bf('owner2'), [
    { id: bf('peer6'), topic: bf('topic1') }
  ]);

  expect(map.peers.length).toBe(4);
  expect(map.topics.length).toBe(2);
});
