# Random Access Storage

Factory for creating platform-specific [random-access-storage](https://github.com/random-access-storage) files.

- `browser`
  - `StorageType.RAM`: [random-access-memory](https://github.com/random-access-storage/random-access-memory).
  - `StorageType.CHROME`: Store files using [random-access-chrome-file](https://github.com/dxos/random-access-chrome-file) and the [Chromium File System API](https://web.dev/native-file-system/).
  - `StorageType.FIREFOX`: Store files using [random-access-idb-mutable-file](https://github.com/random-access-storage/random-access-idb-mutable-file) and the [Firefox IDBMutableFile](https://developer.mozilla.org/en-US/docs/Web/API/IDBMutableFile).
  - `StorageType.IDB`: Store files in an IDB database using [random-access-idb](https://github.com/random-access-storage/random-access-idb).
- `node`
  - `StorageType.RAM`: [random-access-memory](https://github.com/random-access-storage/random-access-memory).
  - `StorageType.NODE`: Store files in the real filesystem [random-access-file](https://github.com/random-access-storage/random-access-file). Default.
