//
// Copyright 2026 DXOS.org
//

import { Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import type { SqliteDatabase } from '@dxos/echo-sqlite';
import {
  type ClientMessage,
  type PushRecord,
  type PushResult,
  type RecordsMessage,
  type ServerMessage,
  SOCKET_PATH,
  SOURCE,
  type SyncRecord,
} from '@dxos/echo-sync-worker/protocol';
import * as SchemaEx from '@dxos/effect/SchemaEx';

import { merge3, onBase, same } from './merge.ts';

/**
 * Two-way sync against the slug's Durable Object: pull, merge, push.
 *
 * Ordering is two counters and no clocks. The server stamps every write it accepts with its next `seq`;
 * this client numbers its own pushes with `clientSeq`. Every pushed record names the server `seq` it was
 * edited on, and the server refuses the push if any of them has moved — so the client pulls what it
 * missed, merges it into its edits field by field, and pushes again.
 *
 * Remote records are applied through the ECHO API — `db.add` / `Obj.update` — never by writing
 * `echo_entities`, because echo-sqlite invalidates queries from its own commits only; a raw-SQL import
 * would never reach the UI.
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

/**
 * The ref-typed properties a type declares, so a record can say which edge was cleared.
 *
 * Absence alone cannot: an object whose ref target is not resident omits the property too, and
 * treating that as a clear would delete edges on every peer that happens to have the target loaded.
 *
 * A multi-valued edge is an array OF refs rather than a ref, so the element type is what carries the
 * reference annotation — `Event.attendees` is invisible to a check on the property type itself.
 */
const refProperties = (type: Type.AnyObj): string[] =>
  SchemaEx.getProperties(Type.getSchema(type).ast)
    .filter((property: SchemaEx.SchemaProperty) =>
      Ref.isRefType(SchemaEx.getArrayElementType(property.type) ?? property.type),
    )
    .map((property: SchemaEx.SchemaProperty) => String(property.name));

export type SyncState = {
  /** Names this client to the server, so a retried push is applied once. */
  client: string;
  /** This client's own counter: the number of its last push. */
  clientSeq: number;
  /** The highest server seq applied here. */
  seq: number;
  /** Which incarnation of the store `seq` belongs to. */
  incarnation?: string;
  /** Per key, the last version the store and this client agreed on, with its seq: what a local edit is based on. */
  base: Record<string, SyncRecord>;
};

const stateKey = (slug: string) => `echo-sqlite-demo:${slug}`;

export const loadState = (slug: string): SyncState => {
  try {
    const raw = localStorage.getItem(stateKey(slug));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SyncState>;
      if (typeof parsed.client === 'string' && Number.isSafeInteger(parsed.seq)) {
        return {
          client: parsed.client,
          clientSeq: parsed.clientSeq ?? 0,
          seq: parsed.seq ?? 0,
          ...(typeof parsed.incarnation === 'string' && { incarnation: parsed.incarnation }),
          base: parsed.base ?? {},
        };
      }
    }
  } catch {
    // A corrupt or blocked store just means a full re-sync.
  }
  return { client: crypto.randomUUID(), clientSeq: 0, seq: 0, base: {} };
};

const saveState = (slug: string, state: SyncState): void => {
  try {
    localStorage.setItem(stateKey(slug), JSON.stringify(state));
  } catch {
    // Private windows block it; sync still works, it just starts from 0 on the next load.
  }
};

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
      const refs: Record<string, string | string[] | null> = {};
      /** The schema's edges, so an edge never travels as a value — an emptied list is not one. */
      const edges = new Set(refProperties(type));
      /** The edges the object actually holds; the rest of them were cleared by whoever wrote it. */
      const held = new Set<string>();
      for (const [prop, value] of Object.entries(obj)) {
        if (prop === 'id' || value === undefined) {
          continue;
        }
        if (Ref.isRef(value)) {
          held.add(prop);
          const targetKey = value.target ? keyOf(value.target) : undefined;
          if (targetKey) {
            refs[prop] = targetKey;
          }
        } else if (Array.isArray(value) && value.some(Ref.isRef)) {
          // A multi-valued edge; a target that is not resident contributes nothing rather than a hole.
          held.add(prop);
          const targetKeys = value.filter(Ref.isRef).flatMap((ref) => {
            const targetKey = ref.target ? keyOf(ref.target) : undefined;
            return targetKey ? [targetKey] : [];
          });
          if (targetKeys.length > 0) {
            refs[prop] = targetKeys;
          }
        } else if (!edges.has(prop)) {
          // Through JSON, so a live array or nested object leaves its proxy behind.
          props[prop] = JSON.parse(JSON.stringify(value));
        }
      }
      // An edge the schema declares and the object holds no reference in was cleared by its writer —
      // an emptied list included; one whose target is merely unloaded is still a `Ref` on the object,
      // so it is omitted instead.
      for (const property of edges) {
        if (!held.has(property)) {
          refs[property] = null;
        }
      }

      out.set(key, { key, typename: name, props, refs });
    }
  }
  return out;
};

/**
 * The deleted objects, as tombstones.
 *
 * `db.remove` is a soft delete, so the row stays and `deleted: 'only'` is what reads it back. Without this a
 * removal would be invisible to sync — gone from the query, so gone from `readLocal`, so nothing to send — and the
 * record would live on in the store and come back to the next peer that asks for it.
 */
const readDeleted = async (db: SqliteDatabase, types: SyncTypes): Promise<SyncRecord[]> => {
  const out: SyncRecord[] = [];
  for (const type of types) {
    const objects = await db.query(Query.select(Filter.type(type)).options({ deleted: 'only' })).run();
    for (const obj of objects) {
      const key = keyOf(obj);
      if (key) {
        out.push({ key, typename: typename(type), props: {}, refs: {}, deleted: true });
      }
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

/**
 * Writes merged records into the local graph: scalars first, so every ref target exists before the edges are wired.
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
        // A property the record does not carry was cleared by whoever wrote it, so clear it here
        // too; without this an edit that empties a field never reaches the other peers, and they
        // push the old value back.
        //
        // Edges are left alone whether single or multi-valued: `readLocal` omits a ref whose target
        // is not resident, so an absent ref does not mean it was cleared — and `attendees`, an array
        // of refs, travels in `refs` rather than `props`, so clearing it here would empty the list
        // on every apply and then push that loss to every peer.
        for (const [property, value] of Object.entries(existing)) {
          const edge = Ref.isRef(value) || (Array.isArray(value) && value.some(Ref.isRef));
          if (property !== 'id' && !(property in record.props) && !(property in record.refs) && !edge) {
            Obj.setValue(existing, [property], undefined);
          }
        }
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
      if (value === null) {
        // Cleared by its writer, which is the one thing an omitted property cannot mean.
        Obj.update(obj, (obj) => {
          Obj.setValue(obj, [prop], undefined);
        });
        continue;
      }
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

/** Every local record, live and deleted, as an edit on top of what the store last agreed to. */
const readAll = async (db: SqliteDatabase, types: SyncTypes, state: SyncState): Promise<Map<string, SyncRecord>> => {
  const live = await readLocal(db, types);
  const all = new Map<string, SyncRecord>();
  for (const record of [...live.values(), ...(await readDeleted(db, types))]) {
    all.set(record.key, onBase(record, state.base[record.key]));
  }
  return all;
};

/** The local records the store has not agreed to. */
const changed = (local: ReadonlyMap<string, SyncRecord>, state: SyncState): SyncRecord[] =>
  [...local.values()].filter((record) => !same(record, state.base[record.key]));

/**
 * Whether a message comes from a store that is not the one the saved seq belongs to — the graph
 * expired and its alarm dropped everything, so nothing it once agreed to survives. The seq alone
 * cannot show this: another peer may have pushed the new store past the saved seq already.
 */
export const isReset = (state: Pick<SyncState, 'incarnation'>, message: { incarnation: string }): boolean =>
  state.incarnation !== undefined && state.incarnation !== message.incarnation;

/** What a message moved; the UI says this out loud. */
export type SyncResult = { sent: number; received: number; expiresAt: number };

/** How long to wait before a reconnect, growing to a ceiling so a worker that is down is not hammered. */
const RECONNECT_MS = { initial: 500, max: 10_000 };

/** Rejected pushes in a row before waiting for the next local change; each one means someone else wrote. */
const MAX_RETRIES = 5;

export type Connection = {
  /** Sends whatever changed locally, unless a push is already waiting for its answer. */
  push: () => Promise<void>;
  close: () => void;
};

export type ConnectionOptions = {
  /** The sync server's origin; defaults to the page's own. */
  server?: string;
  /** A message was applied. */
  onSync?: (result: SyncResult) => void;
  /** The socket closed, or a message could not be applied. */
  onError?: (error: Error) => void;
};

/**
 * Holds a socket to the graph's Durable Object and runs pull → merge → push over it.
 *
 * On open the client pulls everything above its seq, then pushes its edits. Other clients' writes
 * arrive as they land and are merged the same way. One push is outstanding at a time; its answer
 * either confirms it (with the seqs it was given) or carries what the client missed, which is merged
 * before pushing again.
 */
export const connect = (
  db: SqliteDatabase,
  slug: string,
  types: SyncTypes,
  { server, onSync, onError }: ConnectionOptions = {},
): Connection => {
  const state = loadState(slug);
  let socket: WebSocket | undefined;
  let closed = false;
  let backoff = RECONNECT_MS.initial;
  let retries = 0;
  let applying: Promise<void> = Promise.resolve();
  let timer: ReturnType<typeof setTimeout> | undefined;
  /** The push waiting for its answer, and how many records it carried. */
  let pending: number | undefined;
  let pendingCount = 0;
  /**
   * What this client sent, by key, until the store sends it back: that record is this client's own
   * write, not a remote one to merge. Kept across reconnects, since a push may land and its answer not.
   */
  const sent = new Map<string, SyncRecord>();

  const save = () => saveState(slug, state);

  const send = (message: ClientMessage) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
      return true;
    }
    return false;
  };

  /** Messages are handled one at a time: two overlapping merges would both read the same stale state. */
  const enqueue = (work: () => Promise<void>) => {
    applying = applying
      .then(work)
      .catch((error) => onError?.(error instanceof Error ? error : new Error(String(error))));
    return applying;
  };

  /** Merges records from the store into the local graph and moves `base` to them; returns how many changed it. */
  const mergeIn = async (records: readonly SyncRecord[]): Promise<number> => {
    const local = await readAll(db, types, state);
    const writes: SyncRecord[] = [];
    for (const remote of records) {
      const base = state.base[remote.key];
      if (base?.seq !== undefined && remote.seq !== undefined && remote.seq <= base.seq) {
        continue;
      }
      state.base[remote.key] = remote;
      const mine = local.get(remote.key);
      if (sent.has(remote.key) && same(sent.get(remote.key), remote)) {
        // This client's own write coming back with its seq; anything edited since stays local and is pushed next.
        sent.delete(remote.key);
        continue;
      }
      const dirty = mine !== undefined && !same(mine, base);
      const target = dirty ? merge3(base, mine, remote) : remote;
      if (!same(target, mine)) {
        writes.push(target);
      }
    }
    await applyRecords(db, types, records, writes);
    return writes.length;
  };

  /** A message from another incarnation of the store: forget the agreement and start from 0. */
  const reset = (incarnation: string) => {
    Object.assign(state, { seq: 0, base: {}, incarnation });
    pending = undefined;
    sent.clear();
    save();
    send({ type: 'pull', since: 0 });
  };

  const push = () =>
    enqueue(async () => {
      if (pending !== undefined || socket?.readyState !== WebSocket.OPEN) {
        return;
      }
      const records = changed(await readAll(db, types, state), state);
      if (records.length === 0) {
        retries = 0;
        return;
      }
      state.clientSeq++;
      pending = state.clientSeq;
      pendingCount = records.length;
      save();
      for (const record of records) {
        sent.set(record.key, record);
      }
      send({
        type: 'push',
        client: state.client,
        clientSeq: state.clientSeq,
        since: state.seq,
        records: records.map((record): PushRecord => ({ ...record, base: state.base[record.key]?.seq ?? 0 })),
      });
    });

  const onRecords = async (message: RecordsMessage) => {
    const received = await mergeIn(message.records);
    if (message.from <= state.seq) {
      state.seq = Math.max(state.seq, message.seq);
    } else {
      // A broadcast from past what this client has pulled: something in between is missing.
      send({ type: 'pull', since: state.seq });
    }
    save();
    onSync?.({ sent: 0, received, expiresAt: message.expiresAt });
  };

  const onAck = async (message: PushResult) => {
    if (message.clientSeq !== pending) {
      return;
    }
    pending = undefined;
    const received = await mergeIn(message.records);
    state.seq = Math.max(state.seq, message.seq);
    save();
    onSync?.({ sent: message.accepted ? pendingCount : 0, received, expiresAt: message.expiresAt });
    if (!message.accepted) {
      // What it missed is merged now, so the same edits go again on top of it.
      for (const key of message.conflicts) {
        sent.delete(key);
      }
      if (++retries > MAX_RETRIES) {
        onError?.(new Error(`Push rejected ${MAX_RETRIES} times; waiting for the next change`));
        retries = 0;
        return;
      }
    } else {
      retries = 0;
    }
    // Edits made while the push was out, or the retry.
    void push();
  };

  const open = () => {
    if (closed) {
      return;
    }
    const url = new URL(`/api/space/${slug}/${SOCKET_PATH}`, server ?? window.location.href);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(url);

    socket.onopen = () => {
      backoff = RECONNECT_MS.initial;
      // The answer to a push sent on the last socket is lost; the pull below brings back whatever landed.
      pending = undefined;
      send({ type: 'pull', since: state.seq });
      // Anything written while the socket was down.
      void push();
    };

    socket.onmessage = (event: MessageEvent) =>
      void enqueue(async () => {
        const message = JSON.parse(String(event.data)) as ServerMessage;
        if (message.type === 'error') {
          pending = undefined;
          onError?.(new Error(message.message));
          return;
        }
        if (state.incarnation === undefined) {
          state.incarnation = message.incarnation;
        } else if (isReset(state, message)) {
          reset(message.incarnation);
          void push();
          return;
        }
        if (message.type === 'records') {
          await onRecords(message);
        } else {
          await onAck(message);
        }
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
