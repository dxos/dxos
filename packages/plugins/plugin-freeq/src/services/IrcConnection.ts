//
// Copyright 2026 DXOS.org
//

import type * as HttpClient from '@effect/platform/HttpClient';
import type * as Effect from 'effect/Effect';

import { log } from '@dxos/log';

import { SASL_MECHANISM } from '../constants';
import { FreeqAuthError, FreeqConnectionError } from '../errors';
import type { CredentialProvider, SaslChallenge } from './CredentialProvider';
import { IrcProtocol } from './IrcProtocol';
import type { Transport } from './Transport';

export type { Transport } from './Transport';

export interface IncomingMessage {
  id: string;
  nick: string;
  text: string;
  ts: number;
}

export interface IrcConnection {
  connect: () => Promise<void>;
  join: (channel: string) => Promise<void>;
  part: (channel: string) => void;
  /** Resolves once the line has actually been written to the transport (immediately if
   * already registered, or after the buffered line flushes on registration). Callers that
   * release a shared connection right after sending must await this to avoid the connection
   * closing before the line reaches the socket. */
  sendMessage: (channel: string, text: string) => Promise<void>;
  onMessage: (channel: string, cb: (message: IncomingMessage) => void) => () => void;
  close: () => void;
}

const nickOf = (prefix?: string): string => (prefix ? prefix.split('!')[0] : 'unknown');

/** Maximum payload length per `AUTHENTICATE` line, per the freeq/IRCv3 SASL framing. */
const SASL_CHUNK_SIZE = 400;

/**
 * Sends a SASL response payload as one-or-more `AUTHENTICATE` lines. Payloads
 * that fit in a single line are sent as-is; longer payloads are split into
 * `SASL_CHUNK_SIZE`-char chunks followed by a final `AUTHENTICATE +` terminator,
 * per the freeq wire protocol.
 */
const sendSaslResponse = (transport: Transport, response: string): void => {
  if (response.length <= SASL_CHUNK_SIZE) {
    transport.send('AUTHENTICATE ' + response);
    return;
  }
  for (let index = 0; index < response.length; index += SASL_CHUNK_SIZE) {
    transport.send('AUTHENTICATE ' + response.slice(index, index + SASL_CHUNK_SIZE));
  }
  transport.send('AUTHENTICATE +');
};

export const makeIrcConnection = (options: {
  transport: Transport;
  nick: string;
  credentialProvider?: CredentialProvider;
  runResponse: (effect: Effect.Effect<string, FreeqAuthError, HttpClient.HttpClient>) => Promise<string>;
}): IrcConnection => {
  const { transport, nick, credentialProvider, runResponse } = options;
  const subscribers = new Map<string, Set<(message: IncomingMessage) => void>>();
  let synthetic = 0;
  let resolveConnect: (() => void) | undefined;
  let rejectConnect: ((error: unknown) => void) | undefined;

  // App-level lines (JOIN, PRIVMSG) must not reach a socket that has not completed
  // registration: the transport may still be CONNECTING, and a real WebSocket throws
  // on send() in that state. Handshake lines are sent directly since they are only
  // ever issued in response to onOpen/server lines, once the socket is already OPEN.
  let registered = false;
  const outbound: Array<{ line: string; onFlush: () => void }> = [];
  // Resolves once `line` has actually reached the transport, so a caller that releases a
  // shared connection right after sending can await the real send rather than the enqueue.
  const enqueueOrSend = (line: string): Promise<void> => {
    if (registered) {
      transport.send(line);
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => outbound.push({ line, onFlush: resolve }));
  };

  // The freeq server still emits a 904 after a guest's `AUTHENTICATE *` abort before
  // proceeding to register the connection unauthenticated; only a real credential
  // exchange (via credentialProvider) treats 904/905 as a connect() rejection.
  let authAttempted = false;

  const handleChallenge = (payload: string): void => {
    if (!credentialProvider) {
      transport.send('AUTHENTICATE *'); // Abort SASL; proceed as guest.
      transport.send('CAP END');
      return;
    }
    authAttempted = true;
    let challenge: SaslChallenge;
    try {
      challenge = JSON.parse(atob(payload));
    } catch (error) {
      rejectConnect?.(new FreeqAuthError({ cause: error }));
      return;
    }
    void runResponse(credentialProvider.respond(challenge))
      .then((response) => sendSaslResponse(transport, response))
      .catch((error) => rejectConnect?.(new FreeqAuthError({ cause: error })));
  };

  const handleLine = (line: string): void => {
    const message = IrcProtocol.parse(line);
    switch (message.command) {
      case 'PING':
        // The PONG token is a single trailing param; IrcProtocol.serialize only
        // colon-prefixes a lone trailing param when it contains a space, so the
        // colon is emitted explicitly here to match conventional IRC framing.
        transport.send('PONG :' + message.params.join(' '));
        break;
      case 'CAP':
        if (message.params[1] === 'LS') {
          transport.send('CAP REQ :sasl');
        } else if (message.params[1] === 'ACK') {
          transport.send('AUTHENTICATE ' + SASL_MECHANISM);
        }
        break;
      case 'AUTHENTICATE':
        handleChallenge(message.params[0]);
        break;
      case '903': // SASL success.
        transport.send('CAP END');
        break;
      case '904': // SASL failure.
      case '905':
        // A guest's own `AUTHENTICATE *` abort also surfaces as 904/905 on the real
        // server; only reject connect() when we actually attempted authentication.
        if (authAttempted) {
          rejectConnect?.(new FreeqAuthError({ message: 'SASL authentication failed.' }));
        }
        break;
      case '001': // Registration complete.
        registered = true;
        resolveConnect?.();
        resolveConnect = undefined;
        rejectConnect = undefined;
        outbound.forEach(({ line, onFlush }) => {
          transport.send(line);
          onFlush();
        });
        outbound.length = 0;
        break;
      case 'PRIVMSG': {
        const [channel, text] = message.params;
        const subs = subscribers.get(channel);
        if (subs) {
          // A malformed/unparseable `time` tag must not poison message ordering with NaN.
          const parsed = message.tags.time ? Date.parse(message.tags.time) : NaN;
          const incoming: IncomingMessage = {
            id: message.tags.msgid ?? `local:${++synthetic}`,
            nick: nickOf(message.prefix),
            text: text ?? '',
            ts: Number.isFinite(parsed) ? parsed : Date.now(),
          };
          subs.forEach((cb) => cb(incoming));
        }
        break;
      }
      default:
        log('irc', { command: message.command });
    }
  };

  transport.onLine(handleLine);
  transport.onOpen(() => {
    transport.send('CAP LS 302');
    transport.send(IrcProtocol.serialize({ command: 'NICK', params: [nick] }));
    transport.send(IrcProtocol.serialize({ command: 'USER', params: [nick, '0', '*', nick] }));
  });
  // Logged for observability only; the `onClose` handler below (not this one) is what
  // unblocks a pending connect(), since a socket error is always followed by `close`.
  transport.onError?.((event) => log.warn('freeq transport error', { event }));
  // A drop before registration completes must not leave connect() hanging forever.
  // Full reconnect/backoff is deferred; this only unblocks a pending caller.
  transport.onClose(() => {
    if (rejectConnect) {
      rejectConnect(new FreeqConnectionError({ message: 'Connection closed before handshake completed.' }));
      resolveConnect = undefined;
      rejectConnect = undefined;
    }
  });

  return {
    connect: () =>
      new Promise<void>((resolve, reject) => {
        resolveConnect = resolve;
        rejectConnect = reject;
      }),
    // `join()`'s contract is to enqueue and return, not to await the flush: callers must
    // not block on registration to proceed to onMessage()/subsequent sends.
    join: (channel) => {
      void enqueueOrSend(IrcProtocol.serialize({ command: 'JOIN', params: [channel] }));
      return Promise.resolve();
    },
    part: (channel) => void enqueueOrSend(IrcProtocol.serialize({ command: 'PART', params: [channel] })),
    sendMessage: (channel, text) =>
      enqueueOrSend(IrcProtocol.serialize({ command: 'PRIVMSG', params: [channel, text] })),
    onMessage: (channel, cb) => {
      const subs = subscribers.get(channel) ?? new Set();
      subs.add(cb);
      subscribers.set(channel, subs);
      return () => subs.delete(cb);
    },
    // Rejecting a pending connect() is handled uniformly by the `onClose` handler
    // above, since `transport.close()` triggers it the same way a remote drop would.
    close: () => transport.close(),
  };
};
