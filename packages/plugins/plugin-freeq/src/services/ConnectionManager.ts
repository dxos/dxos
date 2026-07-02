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
      void entry.connection.connect();
    }
    entry.refCount++;

    let released = false;
    return {
      connection: entry.connection,
      release: () => {
        if (released) {
          return;
        }
        released = true;
        const current = this.#entries.get(key);
        if (!current) {
          return;
        }
        current.refCount--;
        if (current.refCount <= 0) {
          current.connection.close();
          this.#entries.delete(key);
        }
      },
    };
  }
}
