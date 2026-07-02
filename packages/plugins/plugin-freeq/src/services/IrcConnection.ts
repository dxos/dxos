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
  sendMessage: (channel: string, text: string) => void;
  onMessage: (channel: string, cb: (message: IncomingMessage) => void) => () => void;
  close: () => void;
}

const nickOf = (prefix?: string): string => (prefix ? prefix.split('!')[0] : 'unknown');

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
  const outbound: string[] = [];
  const enqueueOrSend = (line: string): void => {
    if (registered) {
      transport.send(line);
    } else {
      outbound.push(line);
    }
  };

  const handleChallenge = (payload: string): void => {
    if (!credentialProvider) {
      transport.send('AUTHENTICATE *'); // Abort SASL; proceed as guest.
      return;
    }
    let challenge: SaslChallenge;
    try {
      challenge = JSON.parse(atob(payload));
    } catch (error) {
      rejectConnect?.(new FreeqAuthError({ cause: error }));
      return;
    }
    void runResponse(credentialProvider.respond(challenge))
      .then((response) => transport.send('AUTHENTICATE ' + response))
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
        rejectConnect?.(new FreeqAuthError({ message: 'SASL authentication failed.' }));
        break;
      case '001': // Registration complete.
        registered = true;
        resolveConnect?.();
        resolveConnect = undefined;
        rejectConnect = undefined;
        outbound.forEach((line) => transport.send(line));
        outbound.length = 0;
        break;
      case 'PRIVMSG': {
        const [channel, text] = message.params;
        const subs = subscribers.get(channel);
        if (subs) {
          const incoming: IncomingMessage = {
            id: message.tags.msgid ?? `local:${++synthetic}`,
            nick: nickOf(message.prefix),
            text: text ?? '',
            ts: message.tags.time ? Date.parse(message.tags.time) : Date.now(),
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

  return {
    connect: () =>
      new Promise<void>((resolve, reject) => {
        resolveConnect = resolve;
        rejectConnect = reject;
      }),
    join: (channel) =>
      new Promise<void>((resolve) => {
        enqueueOrSend(IrcProtocol.serialize({ command: 'JOIN', params: [channel] }));
        resolve();
      }),
    part: (channel) => transport.send(IrcProtocol.serialize({ command: 'PART', params: [channel] })),
    sendMessage: (channel, text) =>
      enqueueOrSend(IrcProtocol.serialize({ command: 'PRIVMSG', params: [channel, text] })),
    onMessage: (channel, cb) => {
      const subs = subscribers.get(channel) ?? new Set();
      subs.add(cb);
      subscribers.set(channel, subs);
      return () => subs.delete(cb);
    },
    close: () => {
      if (rejectConnect) {
        rejectConnect(new FreeqConnectionError({ message: 'Connection closed before handshake completed.' }));
        resolveConnect = undefined;
        rejectConnect = undefined;
      }
      transport.close();
    },
  };
};
