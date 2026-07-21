//
// Copyright 2026 DXOS.org
//

import type * as HttpClient from '@effect/platform/HttpClient';
import type * as Effect from 'effect/Effect';

import type { FreeqAuthError } from '../errors';
import type { CredentialProvider } from './CredentialProvider';
import { type IrcConnection, makeIrcConnection } from './IrcConnection';
import { makeWebSocketTransport } from './Transport';

export interface ConnectionParams {
  serverUrl: string;
  identityKey: string;
  nick: string;
  credentialProvider?: CredentialProvider;
  runResponse: (effect: Effect.Effect<string, FreeqAuthError, HttpClient.HttpClient>) => Promise<string>;
}

export interface ConnectionHandle {
  connection: IrcConnection;
  release: () => void;
}

interface Entry {
  connection: IrcConnection;
  refCount: number;
}

const keyOf = (params: ConnectionParams): string => `${params.serverUrl}::${params.identityKey}`;

/**
 * Owns one `IrcConnection` per `(serverUrl, identity)` and reference-counts
 * consumers so that multiple Composer channels on the same server multiplex a
 * single WebSocket. The connection is created and connected on first acquire
 * and closed when the last handle is released.
 */
export class ConnectionManager {
  readonly #entries = new Map<string, Entry>();
  readonly #makeConnection: (params: ConnectionParams) => IrcConnection;

  constructor(options?: { makeConnection?: (params: ConnectionParams) => IrcConnection }) {
    this.#makeConnection =
      options?.makeConnection ??
      ((params) =>
        makeIrcConnection({
          transport: makeWebSocketTransport(params.serverUrl),
          nick: params.nick,
          credentialProvider: params.credentialProvider,
          runResponse: params.runResponse,
        }));
  }

  acquire(params: ConnectionParams): ConnectionHandle {
    const key = keyOf(params);
    let entry = this.#entries.get(key);
    if (!entry) {
      entry = { connection: this.#makeConnection(params), refCount: 0 };
      this.#entries.set(key, entry);
      const created = entry;
      // A connection that fails its handshake (e.g. SASL rejection) must not linger
      // in `#entries`, or every later acquire for this key would reuse the dead connection.
      // The underlying socket is also closed here, since nothing else holds a reference
      // to it once it is evicted.
      void created.connection.connect().catch(() => {
        if (this.#entries.get(key) === created) {
          created.connection.close();
          this.#entries.delete(key);
        }
      });
    }
    entry.refCount++;

    // Capture the exact entry this handle acquired: if it is evicted (e.g. by a
    // rejected connect()) and replaced before release() runs, this handle must not
    // touch whatever new entry now lives at `key`.
    const acquired = entry;
    let released = false;
    return {
      connection: acquired.connection,
      release: () => {
        if (released) {
          return;
        }
        released = true;
        if (this.#entries.get(key) !== acquired) {
          return;
        }
        acquired.refCount--;
        if (acquired.refCount <= 0) {
          acquired.connection.close();
          this.#entries.delete(key);
        }
      },
    };
  }
}
