//
// Copyright 2026 DXOS.org
//

import { Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import type { SqliteDatabase } from '@dxos/echo-sqlite';

import {
  type ClientMessage,
  type ServerMessage,
  SOCKET_PATH,
  SOURCE,
  type SyncRecord,
  type SyncResponse,
} from './protocol.ts';

/**
 * Two-way sync against the slug's Durable Object.
 *
 * The DO assigns every record a version in a total order, so last-writer-wins is well defined
 * rather than a race. Remote records are applied through the ECHO API — `db.add` / `Obj.update` —
 * never by writing `echo_entities`, because echo-sqlite invalidates queries from its own commits
 * only; a raw-SQL import would never reach the UI.
 *
 * Objects are matched on a foreign key in `Obj.Meta.keys`, not the ECHO id, which `Obj.make` mints
 * itself and cannot be given.
 */

/** The ECHO types a graph holds; every call takes the same set the database was opened with. */
export type SyncTypes = readonly Type.AnyObj[];

const typename = (type: Type.AnyObj) => Type.getTypename(type)!;

const index = (types: SyncTypes) => new Map(types.map((type) => [typename(type), type]));

export const foreignKey = (key: string) => ({ source: SOURCE, id: key });

const keyOf = (obj: Obj.Unknown): string | undefined => Obj.getKeys(obj, SOURCE)[0]?.id;

export type SyncState = {
  /** The highest version applied from the store. */
  version: number;
  /** Per-key fingerprint of what was last in agreement with the store. */
  hashes: Record<string, string>;
};

const stateKey = (slug: string) => `echo-sqlite-demo:${slug}`;

export const loadState = (slug: string): SyncState => {
  try {
    const raw = localStorage.getItem(stateKey(slug));
    if (raw) {
      const parsed = JSON.parse(raw) as SyncState;
      if (Number.isSafeInteger(parsed?.version)) {
        return { version: parsed.version, hashes: parsed.hashes ?? {} };
      }
    }
  } catch {
    // A corrupt or blocked store just means a full re-sync.
  }
  return { version: 0, hashes: {} };
};

const saveState = (slug: string, state: SyncState): void => {
  try {
    localStorage.setItem(stateKey(slug), JSON.stringify(state));
  } catch {
    // Private windows block it; sync still works, it just resends everything.
  }
};

/** Cheap and stable — only used to spot a local edit, never for security. */
const fingerprint = (record: SyncRecord): string =>
  JSON.stringify([record.typename, record.props, record.refs, record.deleted ?? false]);

/**
 * Every local object of a known type, in wire form.
 *
 * Fields are read off the object rather than from a declared list: a `Ref` is an edge, anything
 * else is a value. Nothing here needs updating when a type gains a field.
 */
const readLocal = async (db: SqliteDatabase, types: SyncTypes): Promise<Map<string, SyncRecord>> => {
  const out = new Map<string, SyncRecord>();
  for (const type of types) {
    const name = typename(type);
    const objects = await db.query(Filter.type(type)).run();
    for (const obj of objects) {
      const key = keyOf(obj);
      if (!key) {
        // Not created by this app (or created before sync existed); it cannot be correlated.
        continue;
      }
      const props: Record<string, unknown> = {};
      const refs: Record<string, string | string[]> = {};
      for (const [prop, value] of Object.entries(obj)) {
        if (prop === 'id' || value === undefined) {
          continue;
        }
        if (Ref.isRef(value)) {
          const targetKey = value.target ? keyOf(value.target) : undefined;
          if (targetKey) {
            refs[prop] = targetKey;
          }
        } else if (Array.isArray(value) && value.some(Ref.isRef)) {
          // A multi-valued edge; a target that is not resident contributes nothing rather than a hole.
          const targetKeys = value.filter(Ref.isRef).flatMap((ref) => {
            const targetKey = ref.target ? keyOf(ref.target) : undefined;
            return targetKey ? [targetKey] : [];
          });
          if (targetKeys.length > 0) {
            refs[prop] = targetKeys;
          }
        } else {
          // Through JSON, so a live array or nested object leaves its proxy behind.
          props[prop] = JSON.parse(JSON.stringify(value));
        }
      }
      out.set(key, { key, typename: name, props, refs });
    }
  }
  return out;
};

/** Find one local object by its foreign key. */
const findByKey = async (db: SqliteDatabase, key: string, type: Type.AnyObj): Promise<Obj.Unknown | undefined> => {
  const [found] = await db.query(Query.select(Filter.foreignKeys(type as never, [foreignKey(key)]))).run();
  return found as Obj.Unknown | undefined;
};

/** The same, when the record's type is not known: a ref names its target's key, not its type. */
const findAnyByKey = async (db: SqliteDatabase, key: string, types: SyncTypes): Promise<Obj.Unknown | undefined> => {
  for (const type of types) {
    const found = await findByKey(db, key, type);
    if (found) {
      return found;
    }
  }
  return undefined;
};

/** What a round trip, or a message, moved; the UI says this out loud. */
export type SyncResult = { sent: number; received: number; expiresAt: number };

/** The records the store has not agreed to: a fingerprint that differs from the one it last confirmed. */
const changesSince = async (db: SqliteDatabase, types: SyncTypes, state: SyncState) => {
  const local = await readLocal(db, types);
  const changed = [...local.values()].filter((record) => fingerprint(record) !== state.hashes[record.key]);
  return { local, changed };
};

/**
 * Applies what the store sent: scalars first, so every ref target exists before the edges are wired.
 *
 * Remote records go in through the ECHO API — `db.add` / `Obj.update` — never by writing `echo_entities`, because
 * echo-sqlite invalidates queries from its own commits only; a raw-SQL import would never reach the UI.
 */
const applyRecords = async (
  db: SqliteDatabase,
  types: SyncTypes,
  records: readonly SyncRecord[],
  incoming: readonly SyncRecord[],
): Promise<void> => {
  const byTypename = index(types);

  // Pass 1: scalars.
  for (const record of incoming) {
    const type = byTypename.get(record.typename);
    if (!type) {
      continue;
    }
    const existing = await findByKey(db, record.key, type);
    if (record.deleted) {
      if (existing) {
        db.remove(existing);
      }
      continue;
    }
    if (existing) {
      Obj.update(existing, (existing) => {
        Object.assign(existing, record.props);
      });
    } else {
      db.add(Obj.make(type as never, { [Obj.Meta]: { keys: [foreignKey(record.key)] }, ...record.props } as never));
    }
  }
  await db.flush();

  // Pass 2: edges.
  for (const record of incoming) {
    if (record.deleted || Object.keys(record.refs).length === 0) {
      continue;
    }
    const type = byTypename.get(record.typename);
    const obj = type && (await findByKey(db, record.key, type));
    if (!obj) {
      continue;
    }
    for (const [prop, value] of Object.entries(record.refs)) {
      const many = Array.isArray(value);
      const targets: Obj.Unknown[] = [];
      for (const targetKey of many ? value : [value]) {
        const targetName = records.find((other) => other.key === targetKey)?.typename;
        const targetType = targetName ? byTypename.get(targetName) : undefined;
        const target = targetType
          ? await findByKey(db, targetKey, targetType)
          : await findAnyByKey(db, targetKey, types);
        if (target) {
          targets.push(target);
        }
      }
      if (targets.length === 0) {
        continue;
      }
      Obj.update(obj, (obj) => {
        Obj.setValue(
          obj,
          [prop],
          many ? targets.map((target) => Ref.make(target as never)) : Ref.make(targets[0] as never),
        );
      });
    }
  }
  await db.flush();
};

/** Applies a response and records the agreement it leaves behind. */
const receive = async (
  db: SqliteDatabase,
  slug: string,
  types: SyncTypes,
  state: SyncState,
  response: SyncResponse,
  local: ReadonlyMap<string, SyncRecord>,
  sent: readonly SyncRecord[],
): Promise<number> => {
  // Only records this client has not seen; the ones it just sent come back too, carrying their versions.
  const incoming = response.records.filter(
    (record) => local.get(record.key) === undefined || fingerprint(record) !== state.hashes[record.key],
  );
  await applyRecords(db, types, response.records, incoming);

  // Agreement is now the union, so fingerprint everything the store holds plus what was sent.
  const hashes: Record<string, string> = { ...state.hashes };
  for (const record of [...response.records, ...sent]) {
    hashes[record.key] = fingerprint(record);
  }
  saveState(slug, { version: response.version, hashes });
  return incoming.length;
};

/**
 * One round trip: send what changed locally, apply what came back.
 *
 * The socket below is the normal path; this remains for a peer that cannot hold one open, and for a script with
 * `curl`. Returns how many records moved in each direction, so the UI can say something true.
 */
export const sync = async (db: SqliteDatabase, slug: string, types: SyncTypes): Promise<SyncResult> => {
  const state = loadState(slug);
  const { local, changed } = await changesSince(db, types, state);

  const response = await fetch(`/api/space/${slug}/sync`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ since: state.version, records: changed }),
  });
  if (!response.ok) {
    const detail = (await response.text()).trim();
    throw new Error(`Sync failed: ${response.status}${detail ? ` ${detail}` : ''}`);
  }
  const body = (await response.json()) as SyncResponse;
  const received = await receive(db, slug, types, state, body, local, changed);

  return { sent: changed.length, received, expiresAt: body.expiresAt };
};

/** How long to wait before a reconnect, growing to a ceiling so a worker that is down is not hammered. */
const RECONNECT_MS = { initial: 500, max: 10_000 };

export type Connection = {
  /** Sends whatever changed locally; the store answers with the records as it now holds them. */
  push: () => Promise<void>;
  close: () => void;
};

export type ConnectionHandlers = {
  /** A message was applied, or the connection opened with nothing to apply. */
  onSync?: (result: SyncResult) => void;
  /** The socket closed, or a message could not be applied. */
  onError?: (error: Error) => void;
};

/**
 * Holds a socket to the graph's Durable Object: the store pushes a write as it happens, rather than the client
 * asking every couple of seconds whether anything has changed.
 *
 * The protocol is two messages. `hello` carries the version this client has applied, so the store answers with
 * everything above it — a first sync and a catch-up after a reconnect are the same exchange. `push` carries local
 * changes, and the store broadcasts them back to every socket, the sender included, so a client learns the versions
 * it was assigned the same way it learns someone else's write.
 */
export const connect = (
  db: SqliteDatabase,
  slug: string,
  types: SyncTypes,
  { onSync, onError }: ConnectionHandlers = {},
): Connection => {
  let socket: WebSocket | undefined;
  let closed = false;
  let backoff = RECONNECT_MS.initial;
  let applying: Promise<void> = Promise.resolve();
  let timer: ReturnType<typeof setTimeout> | undefined;
  /**
   * What has been sent but not yet seen coming back, by key and fingerprint. The agreement in local storage is
   * written only when the broadcast arrives, so without this a second push in the meantime — one write per query
   * that re-executed — would send the same records again and the store would version them twice.
   */
  const inFlight = new Map<string, string>();

  /** Messages are applied one at a time: two overlapping applies would both read the same stale state. */
  const enqueue = (work: () => Promise<void>) => {
    applying = applying
      .then(work)
      .catch((error) => onError?.(error instanceof Error ? error : new Error(String(error))));
    return applying;
  };

  const push = () =>
    enqueue(async () => {
      const state = loadState(slug);
      const { changed } = await changesSince(db, types, state);
      const records = changed.filter((record) => inFlight.get(record.key) !== fingerprint(record));
      if (records.length === 0 || socket?.readyState !== WebSocket.OPEN) {
        return;
      }
      for (const record of records) {
        inFlight.set(record.key, fingerprint(record));
      }
      socket.send(JSON.stringify({ type: 'push', records } satisfies ClientMessage));
    });

  const open = () => {
    if (closed) {
      return;
    }
    const url = new URL(`/api/space/${slug}/${SOCKET_PATH}`, window.location.href);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(url);

    socket.onopen = () => {
      backoff = RECONNECT_MS.initial;
      // A socket that went away never acknowledged what it carried, so none of it is in flight any more.
      inFlight.clear();
      socket?.send(JSON.stringify({ type: 'hello', since: loadState(slug).version } satisfies ClientMessage));
      // Anything written while the socket was down.
      void push();
    };

    socket.onmessage = (event: MessageEvent) =>
      void enqueue(async () => {
        const message = JSON.parse(String(event.data)) as ServerMessage | { type: 'error'; message: string };
        if (message.type !== 'records') {
          onError?.(new Error('message' in message ? message.message : 'Unknown message'));
          return;
        }
        for (const record of message.records) {
          // Back from the store with its version: this client's copy is no longer in flight.
          if (inFlight.get(record.key) === fingerprint(record)) {
            inFlight.delete(record.key);
          }
        }
        const state = loadState(slug);
        const local = await readLocal(db, types);
        const received = await receive(db, slug, types, state, message, local, []);
        onSync?.({ sent: 0, received, expiresAt: message.expiresAt });
      });

    socket.onclose = () => {
      socket = undefined;
      if (closed) {
        return;
      }
      onError?.(new Error('Disconnected'));
      timer = setTimeout(open, backoff);
      backoff = Math.min(backoff * 2, RECONNECT_MS.max);
    };

    // `onclose` follows an error, so the reconnect is scheduled in one place.
    socket.onerror = () => {};
  };

  open();

  return {
    push: () => push(),
    close: () => {
      closed = true;
      clearTimeout(timer);
      socket?.close();
      socket = undefined;
    },
  };
};
