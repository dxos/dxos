# Network generator
> Simulate a network graph of connection streams.

## Install

```
$ npm install @dxos/network-generator
```

## Usage

```javascript
import { NetworkGenerator } from '@dxos/network-generator';

const generator = new NetworkGenerator({
  async createPeer(id) {
    // defines the peer object for the network. An "id" is required.
    return { id, name: `peer${nodeId}` };
  }
  async createConnection(peerFrom, peerTo) {
    // do something to connect peerFrom <--> peerTo
  }
});

(async () => {
  const network = await generator.balancedBinTree(5);

  console.log(network.peers)
  console.log(network.connections)
})();
```

## API

#### `const generator = new NetworkGenerator([options])`

Creates a network generator instance.

- `options`:
  - `createPeer: async (id: Buffer) => Object`: Defines how to create the peer object.
  - `createConnection: async (peerFrom, peerTo) => Stream`: Defines how to create a connection between peerFrom and peerTo. **It can return an optional stream.**

#### `const network = await generator.balancedBinTree(n)`

Creates a network using a balanced binary tree topology n levels

- `n: number`: Number of levels for the binary tree.

> NetworkGenerator uses ngraph.generator, you can generate any topology supported by them [topologies](https://github.com/anvaka/ngraph.generators#ladder)

#### `network.peers -> Peer[]`

Returns an array of peers.

#### `network.connections -> Connection[]`

Returns an array of connections.

#### `network.graph -> ngraph`

Returns the ngraph instance.

#### `await network.addPeer(id) -> Peer`

Adds a new peer to the network.

#### `await network.deletePeer(id)`

Deletes a peer from the network.

#### `await network.addConnection(fromId, toId) -> Connection`

Adds a new connection to the network.

- `Connection: { fromPeer, toPeer, stream }`

#### `await network.deleteConnection(fromId, toId)`

Deletes a connection from the network.

#### `await network.destroy()`

Destroy the entire network.

## Contributing

PRs accepted.

## License

GPL-3.0 © dxos
