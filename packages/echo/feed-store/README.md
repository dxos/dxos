# FeedStore

> A consistent store for your hypercore feeds.

[![Build Status](https://travis-ci.com/dxos/feed-store.svg?branch=master)](https://travis-ci.com/dxos/feed-store)
[![Coverage Status](https://coveralls.io/repos/github/dxos/feed-store/badge.svg?branch=master)](https://coveralls.io/github/dxos/feed-store?branch=master)
![npm (scoped)](https://img.shields.io/npm/v/@dxos/feed-store)
[![Greenkeeper badge](https://badges.greenkeeper.io/dxos/feed-store.svg)](https://greenkeeper.io/)
[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat-square)](https://github.com/standard/semistandard)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

FeedStore was created to administrate your hypercore feeds in a similar abstraction to work with files in a FileSystem.

Each feed created by FeedStore works with an underlying object `descriptor` which provides additional information about the feed and how to work with it.

Features:
- Open/Close hypercore feeds.
- Load hypercore feeds by demand.
- Persist feeds metadata into a hypertrie database.
- Search feeds by a path or any property related to the feed.
- Add metadata to your feed.
- Support for multiple codecs.

## Install

```
$ npm install @dxos/feed-store
```

## Usage

```javascript
import { FeedStore } from '@dxos/feed-store';

(async () => {
  const feedStore = await FeedStore.create('./db', {
    feedOptions: { valueEncoding: 'utf-8' }
  });

  // Open a feed. If the feed doesn't exist, it would be created.
  const foo = await feedStore.openFeed('/foo');

  foo.append('foo', () => {
    foo.head(console.log);
  });

  // You can open a feed with custom hypercore options.
  const bar = await feedStore.openFeed('/bar', {
    key: Buffer.from('...'),
    secretKey: Buffer.from('...'),
    valueEncoding: 'json',
    metadata: { tag: 'bar' } // Save serializable feed metadata.
  });
})();
```

## API

#### `const feedStore = await feedStore.create(storage, [options])`

Creates and initializes a new FeedStore.

- `storage: RandomAccessStorage`: Storage used by the feeds to store their data.
- `options`:
  - `database: () => Hypertrie`: Defines a custom hypertrie database to index the feeds.
  - `feedOptions: Object`: Default hypercore options for each feed.
  - `codecs: Object`: Defines a list of available codecs to work with the feeds.
  - `hypercore: Hypercore`: Defines the Hypercore class to create feeds.

#### `const feedStore = new FeedStore(storage, [options])`

Creates a new FeedStore `without wait for their initialization.`

> The initialization happens by running: `await feedStore.initialize()`

#### `feedStore.openFeed(path, [options]) -> Promise<Hypercore>`

Creates a new hypercore feed identified by a string path.

> If the feed exists but is not loaded it will load the feed instead of creating a new one.

- `path: string`: A require name to identify and index the feed to open.
- `options: Object`: Feed options.
  - `metadata: *`: Serializable value with custom data about the feed.
  - `[...hypercoreOptions]`: Hypercore options.

#### `feedStore.closeFeed(path) -> Promise`

Close a feed by the path.

#### `feedStore.deleteDescriptor(path) -> Promise`

Remove a descriptor from the database by the path.

> This operation would not close the feed.

#### `feedStore.close() -> Promise`

Close the hypertrie database and their feeds.

#### `feedStore.openFeeds((descriptor) => Boolean) -> Promise<Hypercore[]>`

Open multiple feeds using a function to filter what feeds you want to load from the database.

```javascript
const feeds = await feedStore.openFeeds(descriptor => descriptor.metadata.tag === 'foo')
```

#### `feedStore.ready() -> Promise`

Wait for feedStore to be ready.

#### `FeedDescriptor`

For each feed created, FeedStore maintain `FeedDescriptor` object.

A `FeedDescriptor` provides the next information:

- `path: string`
- `key: Buffer`
- `secretKey: Buffer`
- `discoveryKey: Buffer`
- `feed: (Hypercore|null)`
- `opened: Boolean`
- `valueEncoding: string|Codec`
- `metadata: *`

#### `feedStore.getDescriptors() -> FeedDescriptor[]`

Returns a list of descriptors.

#### `feedStore.getDescriptorByDiscoveryKey(discoveryKey) -> FeedDescriptor`

Fast access to get a descriptor.

#### `feedStore.getOpenFeeds([descriptor => Boolean]) -> Hypercore[]`

Returns a list of opened hypercore feeds, with optional filter.

- `descriptor: FeedDescriptor`

#### `feedStore.getOpenFeed(descriptor => Boolean) -> Hypercore[]`

Find an opened feed using a filter callback.

- `descriptor: FeedDescriptor`

#### `feedStore.createReadStream([callback|options]) -> ReadableStream`

Creates a ReadableStream from the loaded feeds.

- `options: Object`: Default options for each feed.createReadStream(options). Optional.
  - `batch: Number`: Defines the batch number of blocks to read in each iteration. Default: 100.
  - `live: Boolean`: Defines the stream as a live stream. Will wait for new incoming data. Default: false.
- `callback: descriptor => Promise<(Object|undefined)>`: Filter function to return options for each feed.createReadStream(). Returns `undefined` will ignore the feed. Optional.
- `descriptor: FeedDescriptor`

The data returned will be an object with:

- `data: Buffer`: The original chunk of the block data.
- `seq: Number`: Sequence number of the read block.
- `key: Buffer`: Key of the read feed.
- `path: String`: FeedStore path of the read feed.
- `metadata: Object`: FeedStore metadata of the read feed.
- `sync: Boolean`: It reports if the current feed stream is sync.

Usage:

```javascript

// Live streaming from all the opened feeds.
const stream = feedStore.createReadStream({ live: true })

// Live streaming, from feeds filter by tag === 'foo'
const stream = feedStore.createReadStream({ live: true }, ({ metadata }) => {
  return metadata.tag === 'foo';
})

// Live streaming, from feeds tag === 'foo'
const stream = feedStore.createReadStream(({ metadata }) => {
  if (metadata.tag === 'foo') {
    return { live: true, start: 10 } // Start reading from index 10.
  }
})
```

#### `feedStore.createBatchStream([callback|options]) -> ReadableStream`

Almost equal to `createReadStream` but the batch messages will be returned in a single array of messages.

### Events

#### `feedStore.on('ready', () => {})`

Emitted when feedStore is loaded.

#### `feedStore.on('append', (feed, descriptor) => {})`

Emitted after an append in any of the loaded feeds.

- `feed: Hypercore`
- `descriptor: FeedDescriptor`

#### `feedStore.on('download', (index, data, feed, descriptor) => {})`

Emitted after a feed download event.

- `index: number` Block index.
- `data: Buffer`
- `feed: Hypercore`
- `descriptor: FeedDescriptor`

#### `feedStore.on('feed', (feed, descriptor) => {})`

Emitted when a feed is loaded.

- `feed: Hypercore`
- `descriptor: FeedDescriptor`

## Contributing

PRs accepted.

## License

GPL-3.0 © dxos
