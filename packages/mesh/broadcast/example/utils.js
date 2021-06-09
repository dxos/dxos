import swarm from '@geut/discovery-swarm-webrtc';

export const nodesToArray = (graph, map) => {
  const nodes = [];
  graph.forEachNode((node) => {
    nodes.push(map ? map(node) : node);
  });
  return nodes;
};

export const linksToArray = (graph, map) => {
  const links = [];
  graph.forEachLink((link) => {
    links.push(map ? map(link) : link);
  });
  return links;
};

export const getConnection = (sw, info) => {
  const connection = [sw.id.toString('hex'), info.id.toString('hex')];

  if (info.initiator) {
    return connection;
  }

  return connection.reverse();
};

export const addPeer = (graph, topic, swarmOptions) => {
  const sw = swarm(swarmOptions);

  graph.addNode(sw.id.toString('hex'), sw);

  sw.on('connection', (socket, info) => {
    socket.on('data', data => sw.emit('data', data));

    const [nodeOne, nodeTwo] = getConnection(sw, info);
    if (!graph.hasLink(nodeOne, nodeTwo)) {
      graph.addLink(nodeOne, nodeTwo);
    }
  });

  sw.on('connection-closed', (_, info) => {
    const [nodeOne, nodeTwo] = getConnection(sw, info);
    if (graph.hasLink(nodeOne, nodeTwo)) {
      graph.removeLink(graph.getLink(nodeOne, nodeTwo));
    }
  });

  sw.on('close', () => {
    graph.removeNode(sw.id.toString('hex'));
  });

  sw.join(topic);

  return sw;
};

export const findPeer = (graph, id) => {
  if (id.length === 32) return graph.getNode(id);

  let peer;
  graph.forEachNode((node) => {
    if (node.id.startsWith(id)) {
      peer = node;
      return true;
    }
  });

  return peer;
};

export const removePeer = (graph, id) => {
  if (graph.getNodesCount() === 0) return;

  let peer;
  if (id) {
    peer = findPeer(graph, id);
  } else {
    const nodes = nodesToArray(graph).filter(n => !n.data._destroyed);
    peer = nodes[Math.floor(Math.random() * nodes.length)];
  }

  peer.data.close((err) => {
    if (err) console.log(err);
  });
};
