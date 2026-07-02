//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { FreeqAuthError, FreeqConnectionError } from '../errors';
import { type IncomingMessage, type Transport, makeIrcConnection } from './IrcConnection';
import { IrcProtocol } from './IrcProtocol';

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
    mock.emit('AUTHENTICATE ' + btoa(JSON.stringify({ session_id: 's', nonce: 'n', timestamp: 1 })));
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

  test('falls back to Date.now() when an inbound message has a malformed time tag', async ({ expect }) => {
    const mock = makeMockTransport();
    const connection = makeIrcConnection({ transport: mock.transport, nick: 'alice', runResponse: async () => '' });
    const connected = connection.connect();
    mock.open();
    mock.emit(':srv 001 alice :Welcome');
    await connected;

    const received: IncomingMessage[] = [];
    connection.onMessage('#general', (m) => received.push(m));
    const before = Date.now();
    mock.emit('@msgid=1;time=not-a-date :bob!b@h PRIVMSG #general :hello');
    const after = Date.now();

    expect(received).toHaveLength(1);
    expect(Number.isFinite(received[0].ts)).toBe(true);
    expect(received[0].ts).toBeGreaterThanOrEqual(before);
    expect(received[0].ts).toBeLessThanOrEqual(after);
  });

  test('sendMessage serializes a PRIVMSG and sends immediately once registered', async ({ expect }) => {
    const mock = makeMockTransport();
    const connection = makeIrcConnection({ transport: mock.transport, nick: 'alice', runResponse: async () => '' });
    const connected = connection.connect();
    mock.open();
    mock.emit(':srv 001 alice :Welcome');
    await connected;

    void connection.sendMessage('#general', 'hi there');
    expect(mock.sent).toContain(IrcProtocol.serialize({ command: 'PRIVMSG', params: ['#general', 'hi there'] }));
  });

  test('sendMessage resolves immediately once registered', async ({ expect }) => {
    const mock = makeMockTransport();
    const connection = makeIrcConnection({ transport: mock.transport, nick: 'alice', runResponse: async () => '' });
    const connected = connection.connect();
    mock.open();
    mock.emit(':srv 001 alice :Welcome');
    await connected;

    await expect(connection.sendMessage('#general', 'hi there')).resolves.toBeUndefined();
  });

  test('sendMessage on a not-yet-registered connection resolves only after the line flushes on 001', async ({
    expect,
  }) => {
    const mock = makeMockTransport();
    const connection = makeIrcConnection({ transport: mock.transport, nick: 'alice', runResponse: async () => '' });
    const connected = connection.connect();
    mock.open();

    const privmsgLine = IrcProtocol.serialize({ command: 'PRIVMSG', params: ['#general', 'hello'] });
    let flushed = false;
    const sent = connection.sendMessage('#general', 'hello').then(() => {
      flushed = true;
    });

    // The promise must not resolve, and the line must not reach the transport, before 001.
    await Promise.resolve();
    expect(flushed).toBe(false);
    expect(mock.sent).not.toContain(privmsgLine);

    mock.emit(':srv 001 alice :Welcome');
    await connected;
    await sent;

    expect(flushed).toBe(true);
    expect(mock.sent).toContain(privmsgLine);
  });

  test('buffers join() and sendMessage() until registration (001), then flushes in order', async ({ expect }) => {
    const mock = makeMockTransport();
    const connection = makeIrcConnection({ transport: mock.transport, nick: 'alice', runResponse: async () => '' });
    const connected = connection.connect();
    mock.open();

    void connection.join('#general');
    void connection.sendMessage('#general', 'hello');

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
    mock.emit('AUTHENTICATE ' + btoa(JSON.stringify({ session_id: 's', nonce: 'n', timestamp: 1 })));
    expect(mock.sent).toContain('AUTHENTICATE *');
  });

  test('guest abort resolves connect() on 904 followed by 001, sending CAP END', async ({ expect }) => {
    const mock = makeMockTransport();
    const connection = makeIrcConnection({ transport: mock.transport, nick: 'alice', runResponse: async () => '' });
    const connected = connection.connect();
    mock.open();
    mock.emit(':srv CAP * LS :sasl');
    mock.emit(':srv CAP alice ACK :sasl');
    mock.emit('AUTHENTICATE ' + btoa(JSON.stringify({ session_id: 's', nonce: 'n', timestamp: 1 })));

    // Real freeq server behavior: a guest abort still yields a 904 numeric before
    // proceeding to register the connection as an unauthenticated guest.
    mock.emit(':srv 904 alice :SASL authentication failed');
    mock.emit(':srv 001 alice :Welcome');

    await connected;

    expect(mock.sent).toContain('AUTHENTICATE *');
    expect(mock.sent).toContain('CAP END');
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
    mock.emit('AUTHENTICATE ' + btoa(JSON.stringify({ session_id: 's', nonce: 'n', timestamp: 1 })));
    mock.emit(':srv 904 alice :auth failed');

    await expect(connected).rejects.toBeInstanceOf(FreeqAuthError);
  });

  test('fragments a >400-char SASL response into chunked AUTHENTICATE lines plus a final +', async ({ expect }) => {
    const mock = makeMockTransport();
    const longResponse = 'A'.repeat(850);
    const connection = makeIrcConnection({
      transport: mock.transport,
      nick: 'alice',
      credentialProvider: { respond: () => undefined as never },
      runResponse: async () => longResponse,
    });

    const connected = connection.connect();
    mock.open();
    mock.emit(':srv CAP * LS :sasl');
    mock.emit(':srv CAP alice ACK :sasl');
    mock.emit('AUTHENTICATE ' + btoa(JSON.stringify({ session_id: 's', nonce: 'n', timestamp: 1 })));
    mock.emit(':srv 903 alice :SASL authentication successful');
    mock.emit(':srv 001 alice :Welcome');
    await connected;

    const authenticateLines = mock.sent.filter((line) => line.startsWith('AUTHENTICATE '));
    // Mechanism line + 3 chunks (400 + 400 + 50) + final terminator.
    const chunkLines = authenticateLines.filter((line) => line !== 'AUTHENTICATE ATPROTO-CHALLENGE');
    expect(chunkLines).toHaveLength(4);
    chunkLines.slice(0, -1).forEach((line) => {
      expect(line.slice('AUTHENTICATE '.length).length).toBeLessThanOrEqual(400);
    });
    expect(chunkLines.at(-1)).toBe('AUTHENTICATE +');
    expect(
      chunkLines
        .slice(0, -1)
        .map((line) => line.slice('AUTHENTICATE '.length))
        .join(''),
    ).toBe(longResponse);
  });

  test('sends a <=400-char SASL response as a single AUTHENTICATE line with no terminator', async ({ expect }) => {
    const mock = makeMockTransport();
    const connection = makeIrcConnection({
      transport: mock.transport,
      nick: 'alice',
      credentialProvider: { respond: () => undefined as never },
      runResponse: async () => 'SHORTRESPONSE',
    });

    const connected = connection.connect();
    mock.open();
    mock.emit(':srv CAP * LS :sasl');
    mock.emit(':srv CAP alice ACK :sasl');
    mock.emit('AUTHENTICATE ' + btoa(JSON.stringify({ session_id: 's', nonce: 'n', timestamp: 1 })));
    mock.emit(':srv 903 alice :SASL authentication successful');
    mock.emit(':srv 001 alice :Welcome');
    await connected;

    expect(mock.sent).toContain('AUTHENTICATE SHORTRESPONSE');
    expect(mock.sent).not.toContain('AUTHENTICATE +');
  });

  test('rejects a pending connect() when the transport closes mid-handshake', async ({ expect }) => {
    const mock = makeMockTransport();
    const connection = makeIrcConnection({ transport: mock.transport, nick: 'alice', runResponse: async () => '' });
    const connected = connection.connect();
    mock.open();
    mock.emit(':srv CAP * LS :sasl');
    mock.emit(':srv CAP alice ACK :sasl');

    mock.transport.close();

    await expect(connected).rejects.toBeInstanceOf(FreeqConnectionError);
  });

  test('buffers part() until registration (001), then flushes it', async ({ expect }) => {
    const mock = makeMockTransport();
    const connection = makeIrcConnection({ transport: mock.transport, nick: 'alice', runResponse: async () => '' });
    const connected = connection.connect();
    mock.open();

    const partLine = IrcProtocol.serialize({ command: 'PART', params: ['#general'] });
    connection.part('#general');

    expect(mock.sent).not.toContain(partLine);

    mock.emit(':srv 001 alice :Welcome');
    await connected;

    expect(mock.sent).toContain(partLine);
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
