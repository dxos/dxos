//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { FreeqAuthError, FreeqConnectionError } from '../errors';
import { type Transport, makeIrcConnection } from './IrcConnection';
import { IrcProtocol } from './IrcProtocol';

// Scriptable in-memory transport.
const makeMockTransport = () => {
  let lineCb: (line: string) => void = () => {};
  let openCb: () => void = () => {};
  let closeCb: () => void = () => {};
  const sent: string[] = [];
  const transport: Transport = {
    send: (line) => sent.push(line),
    close: () => closeCb(),
    onLine: (cb) => (lineCb = cb),
    onOpen: (cb) => (openCb = cb),
    onClose: (cb) => (closeCb = cb),
  };
  return { transport, sent, emit: (line: string) => lineCb(line), open: () => openCb() };
};

describe('IrcConnection', () => {
  test('completes CAP + SASL handshake and resolves connect() on 001', async ({ expect }) => {
    const mock = makeMockTransport();
    const connection = makeIrcConnection({
      transport: mock.transport,
      nick: 'alice',
      credentialProvider: { respond: () => undefined as never },
      runResponse: async () => 'BASE64RESPONSE',
    });

    const connected = connection.connect();
    mock.open();

    // Server acknowledges CAP and advertises SASL.
    mock.emit(':srv CAP * LS :sasl');
    mock.emit(':srv CAP alice ACK :sasl');
    // Server issues the challenge.
    mock.emit('AUTHENTICATE ' + btoa(JSON.stringify({ sessionId: 's', nonce: 'n', ts: 1 })));
    // SASL + registration success.
    mock.emit(':srv 900 alice :logged in');
    mock.emit(':srv 903 alice :SASL authentication successful');
    mock.emit(':srv 001 alice :Welcome');

    await connected;

    expect(mock.sent).toContain('CAP LS 302');
    expect(mock.sent).toContain('CAP REQ :sasl');
    expect(mock.sent).toContain('AUTHENTICATE ' + 'ATPROTO-CHALLENGE');
    expect(mock.sent).toContain('AUTHENTICATE BASE64RESPONSE');
    expect(mock.sent).toContain('CAP END');
  });

  test('dispatches inbound PRIVMSG to channel subscribers', async ({ expect }) => {
    const mock = makeMockTransport();
    const connection = makeIrcConnection({ transport: mock.transport, nick: 'alice', runResponse: async () => '' });
    const connected = connection.connect();
    mock.open();
    mock.emit(':srv 001 alice :Welcome');
    await connected;

    const received: string[] = [];
    connection.onMessage('#general', (m) => received.push(m.text));
    mock.emit('@msgid=1 :bob!b@h PRIVMSG #general :hello');
    expect(received).toEqual(['hello']);
  });

  test('sendMessage serializes a PRIVMSG and sends immediately once registered', async ({ expect }) => {
    const mock = makeMockTransport();
    const connection = makeIrcConnection({ transport: mock.transport, nick: 'alice', runResponse: async () => '' });
    const connected = connection.connect();
    mock.open();
    mock.emit(':srv 001 alice :Welcome');
    await connected;

    connection.sendMessage('#general', 'hi there');
    expect(mock.sent).toContain(IrcProtocol.serialize({ command: 'PRIVMSG', params: ['#general', 'hi there'] }));
  });

  test('buffers join() and sendMessage() until registration (001), then flushes in order', async ({ expect }) => {
    const mock = makeMockTransport();
    const connection = makeIrcConnection({ transport: mock.transport, nick: 'alice', runResponse: async () => '' });
    const connected = connection.connect();
    mock.open();

    void connection.join('#general');
    connection.sendMessage('#general', 'hello');

    const joinLine = IrcProtocol.serialize({ command: 'JOIN', params: ['#general'] });
    const privmsgLine = IrcProtocol.serialize({ command: 'PRIVMSG', params: ['#general', 'hello'] });

    // Neither app-level line may reach the transport before registration completes.
    expect(mock.sent).not.toContain(joinLine);
    expect(mock.sent).not.toContain(privmsgLine);

    mock.emit(':srv 001 alice :Welcome');
    await connected;

    expect(mock.sent).toContain(joinLine);
    expect(mock.sent).toContain(privmsgLine);
    expect(mock.sent.indexOf(joinLine)).toBeLessThan(mock.sent.indexOf(privmsgLine));
  });

  test('replies to PING with PONG', ({ expect }) => {
    const mock = makeMockTransport();
    const connection = makeIrcConnection({ transport: mock.transport, nick: 'alice', runResponse: async () => '' });
    void connection.connect();
    mock.open();
    mock.emit('PING :srv1');
    expect(mock.sent).toContain('PONG :srv1');
  });

  test('aborts SASL as guest when no credentialProvider is supplied', ({ expect }) => {
    const mock = makeMockTransport();
    const connection = makeIrcConnection({ transport: mock.transport, nick: 'alice', runResponse: async () => '' });
    void connection.connect();
    mock.open();
    mock.emit(':srv CAP * LS :sasl');
    mock.emit(':srv CAP alice ACK :sasl');
    mock.emit('AUTHENTICATE ' + btoa(JSON.stringify({ sessionId: 's', nonce: 'n', ts: 1 })));
    expect(mock.sent).toContain('AUTHENTICATE *');
  });

  test('rejects connect() with FreeqAuthError on SASL failure (904)', async ({ expect }) => {
    const mock = makeMockTransport();
    const connection = makeIrcConnection({
      transport: mock.transport,
      nick: 'alice',
      credentialProvider: { respond: () => undefined as never },
      runResponse: async () => 'BASE64RESPONSE',
    });

    const connected = connection.connect();
    mock.open();
    mock.emit(':srv CAP * LS :sasl');
    mock.emit(':srv CAP alice ACK :sasl');
    mock.emit('AUTHENTICATE ' + btoa(JSON.stringify({ sessionId: 's', nonce: 'n', ts: 1 })));
    mock.emit(':srv 904 alice :auth failed');

    await expect(connected).rejects.toBeInstanceOf(FreeqAuthError);
  });

  test('rejects a pending connect() when close() is called mid-handshake', async ({ expect }) => {
    const mock = makeMockTransport();
    const connection = makeIrcConnection({ transport: mock.transport, nick: 'alice', runResponse: async () => '' });
    const connected = connection.connect();
    mock.open();
    mock.emit(':srv CAP * LS :sasl');
    mock.emit(':srv CAP alice ACK :sasl');

    connection.close();

    await expect(connected).rejects.toBeInstanceOf(FreeqConnectionError);
  });
});
