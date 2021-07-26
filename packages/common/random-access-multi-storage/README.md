# Random Access Multi Storage

[![Build Status](https://travis-ci.com/dxos/random-access-multi-storage.svg?branch=master)](https://travis-ci.com/dxos/random-access-multi-storage)
[![Coverage Status](https://coveralls.io/repos/github/dxos/random-access-multi-storage/badge.svg?branch=master)](https://coveralls.io/github/dxos/random-access-multi-storage?branch=master)
[![Greenkeeper badge](https://badges.greenkeeper.io/dxos/random-access-multi-storage.svg)](https://greenkeeper.io/)
[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat-square)](https://github.com/standard/semistandard)
[![standard-readme compliant](https://img.shields.io/badge/readme%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

Factory for creating platform-specific [random-access-storage](https://github.com/random-access-storage) files.

## Install

```
$ npm install @dxos/random-access-multi-storage
```

## Usage

```javascript
import { createStorage } from '@dxos/random-access-multi-storage';

const storage = createStorage('./dir');

const file = storage('test.txt')
file.write(0, Buffer('hello'), err => {
  file.read(0, 5, (err, data) => {
    console.log(data.toString())
  })
});
```

## API

#### `createStorage(rootPath: String, storageType?: StorageType) => RandomAccessStorage`

Create a [RandomAccessStorage](https://github.com/random-access-storage/random-access-storage) based in the `storageType`. If `storageType` is not specified, return a default `RandomAccessStorage` depending on the environment.

- `rootPath`: Root path to store the files.
- `storageType`: Storage type.

Available storages:

```js
import { STORAGE_CHROME, STORAGE_FIREFOX, ... } from '@dxos/random-access-multi-storage'
```

- `browser`
  - `STORAGE_CHROME`: Store files using [random-access-chrome-file](https://github.com/dxos/random-access-chrome-file) and the [Chromium File System API](https://web.dev/native-file-system/). Default in Chrome.
  - `STORAGE_FIREFOX`: Store files using [random-access-idb-mutable-file](https://github.com/random-access-storage/random-access-idb-mutable-file) and the [Firefox IDBMutableFile](https://developer.mozilla.org/en-US/docs/Web/API/IDBMutableFile). Default in Firefox.
  - `STORAGE_IDB`: Store files in an IDB database using [random-access-idb](https://github.com/random-access-storage/random-access-idb). Fallback.
  - `STORAGE_RAM`: [random-access-memory](https://github.com/random-access-storage/random-access-memory).
- `node`
  - `STORAGE_NODE`: Store files in the real filesystem [random-access-file](https://github.com/random-access-storage/random-access-file). Default.
  - `STORAGE_RAM`: [random-access-memory](https://github.com/random-access-storage/random-access-memory).

## Contributing

PRs accepted.

## License

GPL-3.0 © dxos
