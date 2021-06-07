import createGraph from 'ngraph.graph';
import ForceGraph from './force-graph';
import { Broadcast } from '..';
import { addPeer as _addPeer, removePeer as _removePeer, findPeer, nodesToArray } from './utils';

const MAX_PEERS = 2;
const TOPIC = Buffer.from('batman');

const graph = createGraph();
const peersTitle = document.getElementById('peers-title');
const connectionsTitle = document.getElementById('connections-title');
const packetsSendedTitle = document.getElementById('packets-sended-title');
const packetsReadedTitle = document.getElementById('packets-readed-title');
const view = ForceGraph()(document.getElementById('graph'));

const changePeerColor = (peer, color) => {
  const node = graph.getNode(peer.id.toString('hex'));
  if (!node) return;
  node.data.color = color;
  graph.addNode(node.id, node.data);
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

let packetsSended = 0;
let packetsReaded = 0;

const addPeer = () => {
  const peer = _addPeer(graph, TOPIC, {
    bootstrap: ['http://localhost:4000']
  });

  const middleware = {
    lookup: () => {
      return peer.getPeers(TOPIC);
    },
    send: async (packet, node) => {
      packetsSended++;
      packetsSendedTitle.innerHTML = packetsSended;

      view.pushParticle(peer.id.toString('hex'), node.id.toString('hex'), { speed: 0.02, color: 'red' });

      await delay(800);

      try {
        node.socket.send(packet);
      } catch (err) {
        console.error(err);
      }
    },
    subscribe: (onMessage) => {
      peer.on('data', onMessage);
      return () => peer.off('data', onMessage);
    }
  };

  const broadcast = new Broadcast(middleware, {
    id: peer.id
  });

  peer.broadcast = broadcast;

  broadcast.on('packet', async () => {
    packetsReaded++;
    packetsReadedTitle.innerHTML = packetsReaded;
    changePeerColor(peer, '#53c379');
  });

  broadcast.run();

  window.broadcast = broadcast;
};
const removePeer = id => _removePeer(graph, id);
const addMany = n => [...Array(n).keys()].forEach(() => addPeer());
const deleteMany = n => [...Array(n).keys()].forEach(() => removePeer());

window.findPeer = id => findPeer(graph, id);

document.getElementById('add-peer').addEventListener('click', () => {
  addPeer();
});

document.getElementById('remove-peer').addEventListener('click', () => {
  removePeer();
});

document.getElementById('add-many-peers').addEventListener('click', () => {
  addMany(25);
});

document.getElementById('remove-many-peers').addEventListener('click', () => {
  deleteMany(25);
});

view
  .nodeVal(4)
  .nodeLabel('id')
  .nodeColor(node => (node.destroyed ? 'red' : node.color))
  .graphData({ nodes: [], links: [] })
  .onNodeRightClick(async (node) => {
    packetsSended = 0;
    packetsReaded = 0;
    graph.forEachNode((node) => {
      node.data.color = null;
      graph.addNode(node.id, node.data);
    });
    const peer = graph.getNode(node.id).data;
    changePeerColor(peer, '#d950cd');
    peer.broadcast.publish(Buffer.from('hello'));
  });

graph.on('changed', (changes) => {
  peersTitle.innerHTML = nodesToArray(graph).filter(n => !n.data._destroyed).length;
  connectionsTitle.innerHTML = graph.getLinksCount();
  const { nodes: oldNodes, links: oldLinks } = view.graphData();

  const newNodes = [];
  const newLinks = [];
  changes.forEach(({ changeType, node, link }) => {
    if (changeType === 'add') {
      if (node) {
        newNodes.push({ id: node.id });
      } else {
        newLinks.push({ source: link.fromId, target: link.toId });
      }
      return;
    }

    if (changeType === 'remove') {
      if (node) {
        const toDelete = oldNodes.find(n => n.id === node.id);
        toDelete.destroyed = true;
      } else {
        const toDelete = oldLinks.findIndex(n => n.source.id === link.fromId && n.target.id === link.toId);
        if (toDelete !== -1) oldLinks.splice(toDelete, 1);
      }
    }

    if (changeType === 'update' && node) {
      const toUpdate = oldNodes.find(n => n.id === node.id);
      toUpdate.color = node.data.color;
    }
  });

  view.graphData({
    nodes: [...oldNodes, ...newNodes],
    links: [...oldLinks, ...newLinks]
  });
});

for (let i = 0; i < MAX_PEERS; i++) {
  addPeer();
}
