# Broadcast
> Abstract module to send broadcast messages.


Allows a node to originate a message that will be received at least once, within a
reasonably short time, on all nodes that are reachable from the origin node. Messages are
propagated via the `middleware` specified. Broadcast storms are
avoided by means of a [flooding](https://en.wikipedia.org/wiki/Flooding_(computer_networking)) routing scheme.

Broadcast messages follows the schema:

```proto
message Packet {
  bytes seqno = 1;
  bytes origin = 2;
  bytes from = 3;
  bytes data = 4;
}
```

- `seqno`: By default is a random 32-bit but could be used to provide an alternative sorted sequence number.
- `origin`: Represents the author's ID of the message. To identify a message (`msgId`) in the network you should check for the: `seqno + origin`.
- `from`: Represents the current sender's ID of the message.
- `data`: Represents an opaque blob of data, it can contain any data that the publisher wants
it to defined by higher layers (e.g. a presence information message).

Nodes send any message originating locally to all current peers. Upon receiving a message, a
node delivers it locally to any listeners, and forward the message on to its current
peers, excluding the peer from which it was received.

Nodes maintain a record of the messages they have received and originated
recently, by `msgId(seqno + from)`. This is used to avoid sending the same message to the same peer
more than once. These records expire after some time to limit memory consumption by: `maxAge` and `maxSize`.

<p align="center">
  <img src="https://user-images.githubusercontent.com/819446/66934639-2bb67980-f011-11e9-9c27-739b5ee5fd5c.gif" alt="graph">
</p>

## Install

```
$ npm install @dxos/broadcast
```

## Usage

```javascript
import { Broadcast } from '@dxos/broadcast';

const middleware = {
  subscribe: (onData, updatePeers) => {
    // Defines how to process incoming data and peers update.

    // on('peers', onPeers)
    // on('data', onData)
    return () => {
      // Return a dispose function.
    }
  },
  send: async (packet, node) => {
    // Define how to send your packets.
    // "packet" is the encoded message to send.
    // "node" is the peer object generate from the lookup.
  }
};

const broadcast = new Broadcast(middleware, {
  id: crypto.randomBytes(32),
  maxAge: 15 * 1000, // Timeout for each message in the LRU cache.
  maxSize: 1000 // Limit of messages in the LRU cache.
})

// We initialize the middleware and subscription inside the broadcast.
await broadcast.open()

broadcast.publish(Buffer.from('Hello everyone'))

await broadcast.close()
```

You can check a real example in: [example](https://github.com/dxos/broadcast/tree/master/example)

## API

#### `const broadcast = new Broadcast(middleware, [options])`

- `middleware`: The middleware defines an interface to connect the broadcast to any request/response solution.
  - `subscribe: ({ onData, onPeers }) => unsubscribeFunction`: Defines how to subscribe to incoming packets and peers update.
    - `onData: (data: Buffer) => (Packet|undefined)`: Callback to process incoming data. It returns true if the broadcast could decode the message or false if not.
    - `onPeers: (peers: [Peer])`: Callback to update the internal list of peers. A `Peer` object must follow the spec: `{ id: Buffer, ...props }`
    - `unsubscribeFunction: Function`: Defines a way to unsubscribe from listening messages if the broadcast stop working. Helpful if you are working with streams and event emitters.
  - `send: (packet: Buffer, peer: Object) => Promise`: Defines how to send the packet builded by the broadcast.

- `options`
  - `id: Buffer`: Defines an id for the current peer. Default: `crypto.randomBytes(32)`.
  - `maxAge: number`: Defines the max live time for the cache messages. Default: `10 * 1000`.
  - `maxSize: number`: Defines the max size for the cache messages. Default: `1000`.

#### `broadcast.open() => Promise`

Initialize the cache and runs the defined subscription.

#### `broadcast.close() => Promise`

Clear the cache and unsubscribe from incoming messages.

#### `broadcast.publish(data, [options]) -> Promise<Packet>`

Broadcast a flooding message to the peers neighboors.

- `data: Buffer`: Any data that you want to broadcast.
- `options`
  - `seqno: Buffer`: Defines a custom seqno for the message. Default: `crypto.randomBytes(32)`.

- `Packet`
  - `seqno: Buffer`
  - `origin: Buffer`
  - `from: Buffer`
  - `data: Buffer`

