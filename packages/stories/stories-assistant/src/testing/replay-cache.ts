//
// Copyright 2026 DXOS.org
//

import { type SerializedSpace } from '@dxos/echo-client';

/** A JSON space archive as {@link SerializedSpace} describes it; anything else in the store is ignored. */
const isSerializedSpace = (value: unknown): value is SerializedSpace =>
  typeof value === 'object' &&
  value !== null &&
  'version' in value &&
  typeof value.version === 'number' &&
  'objects' in value &&
  Array.isArray(value.objects);

/** The IndexedDB database every recorded replay is kept in. */
const DATABASE_NAME = 'dxos.org/stories-assistant/replays';

const STORE_NAME = 'archives';

/** Bumped when what a cache entry holds changes shape, so entries an older story wrote are never read. */
const SCHEMA_VERSION = 1;

/** Stable JSON for a scene: RegExps and functions, which `JSON.stringify` drops or empties, are kept as their source. */
const stringifyScene = (source: unknown): string =>
  JSON.stringify(source, (_key, value: unknown) =>
    value instanceof RegExp || typeof value === 'function' ? String(value) : value,
  );

/** A hex SHA-256 of `text`. */
const digest = async (text: string): Promise<string> => {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

/** Runs `request` against the store; IndexedDB answers through callbacks, so this is where its Promise starts. */
const withStore = <T>(mode: IDBTransactionMode, request: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    const open = indexedDB.open(DATABASE_NAME, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE_NAME);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const database = open.result;
      const transaction = database.transaction(STORE_NAME, mode);
      const result = request(transaction.objectStore(STORE_NAME));
      transaction.oncomplete = () => {
        database.close();
        resolve(result.result);
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error);
      };
    };
  });

/**
 * A recorded replay kept in IndexedDB across reloads, as the JSON archive of the space it ran in. The entry is keyed
 * by a fingerprint of what produced it (the scene, the prompts, the settings), so it lapses as soon as the script
 * changes.
 */
export class ReplayCache {
  readonly #name: string;
  readonly #source: unknown;
  #key?: Promise<string>;

  /**
   * @param name Names the story the entry belongs to.
   * @param source Everything the recording depends on; hashed into the entry's key.
   */
  constructor(name: string, source: unknown) {
    this.#name = name;
    this.#source = source;
  }

  /** The entry's key: the story's name, the schema version and the hash of its source. */
  key(): Promise<string> {
    this.#key ??= digest(stringifyScene(this.#source)).then((hash) => `${this.#name}/v${SCHEMA_VERSION}/${hash}`);
    return this.#key;
  }

  /** The recorded space archive, or `undefined` when nothing usable is recorded for the current key. */
  async load(): Promise<SerializedSpace | undefined> {
    const key = await this.key();
    const text = await withStore<unknown>('readonly', (store) => store.get(key));
    if (typeof text !== 'string') {
      return undefined;
    }
    const archive: unknown = JSON.parse(text);
    return isSerializedSpace(archive) ? archive : undefined;
  }

  /** Records `archive`, a JSON space archive's text, replacing every entry this story recorded before. */
  async save(archive: string): Promise<void> {
    const key = await this.key();
    await this.clear();
    await withStore('readwrite', (store) => store.put(archive, key));
  }

  /** Removes every entry this story recorded, under any key. */
  async clear(): Promise<void> {
    const prefix = `${this.#name}/`;
    await withStore('readwrite', (store) => store.delete(IDBKeyRange.bound(prefix, `${prefix}￿`)));
  }
}
