# @dxos/broadcast

Abstract module to send broadcast messages.

## Background

Allows a node to originate a message that will be received at least once, within a
reasonably short time, on all nodes that are reachable from the origin node. Messages are
propagated via the `middleware` specified. Broadcast storms are
avoided by means of a [flooding](<https://en.wikipedia.org/wiki/Flooding_(computer_networking)>) routing scheme.

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

## Installation

```bash
pnpm i @dxos/broadcast
```

## Usage

```javascript
import { Broadcast } from "@dxos/broadcast";

const middleware = {
  subscribe: (onData, updatePeers) => {
    // Defines how to process incoming data and peers update.

    // on('peers', onPeers)
    // on('data', onData)
    return () => {
      // Return a dispose function.
    };
  },
  send: async (packet, node) => {
    // Define how to send your packets.
    // "packet" is the encoded message to send.
    // "node" is the peer object generate from the lookup.
  },
};

const broadcast = new Broadcast(middleware, {
  id: crypto.randomBytes(32),
  maxAge: 15 * 1000, // Timeout for each message in the LRU cache.
  maxSize: 1000, // Limit of messages in the LRU cache.
});

// We initialize the middleware and subscription inside the broadcast.
await broadcast.open();

broadcast.publish(Buffer.from("Hello everyone"));

await broadcast.close();
```

You can check a real example in: [example](https://github.com/dxos/broadcast/tree/master/example)

## Documentation

- [📚 API Reference](https://docs.dxos.org/api/@dxos/broadcast)

## DXOS Resources

- [Website](https://dxos.org)
- [Developer Documentation](https://docs.dxos.org)
- [Blog](https://blog.dxos.org)
- [Roadmap](https://docs.dxos.org/roadmap)
- [Events calendar](https://blog.dxos.org/events)
- Hang out with the community on [Discord](https://dxos.org/discord)
- Tag [questions on Stack Overflow](https://stackoverflow.com/questions/tagged/dxos) with `#dxos`
- Tag us on twitter [`@dxos_org`](https://twitter.com/dxos_org)

## Contributions

Your ideas, issues, and code are most welcome. Please take a look at our [community code of conduct](), the [issue guide](https://github.com/dxos/dxos/issues), and the [PR contribution guide](). If you would like to contribute to the design and implementation of DXOS, please [start with the contributor's guide]().

License: [MIT](./LICENSE.md) Copyright 2022 © DXOS
