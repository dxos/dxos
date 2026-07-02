//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { IrcProtocol } from './IrcProtocol';

describe('IrcProtocol', () => {
  test('parses a PRIVMSG with prefix and trailing param', ({ expect }) => {
    const msg = IrcProtocol.parse(':alice!a@host PRIVMSG #general :hello world');
    expect(msg.prefix).toBe('alice!a@host');
    expect(msg.command).toBe('PRIVMSG');
    expect(msg.params).toEqual(['#general', 'hello world']);
  });

  test('parses message tags with escaping', ({ expect }) => {
    const msg = IrcProtocol.parse('@msgid=abc;+draft/x=a\\sb :srv PRIVMSG #c :hi');
    expect(msg.tags.msgid).toBe('abc');
    expect(msg.tags['+draft/x']).toBe('a b');
    expect(msg.command).toBe('PRIVMSG');
  });

  test('parses a command with no params (PING)', ({ expect }) => {
    const msg = IrcProtocol.parse('PING :srv1');
    expect(msg.command).toBe('PING');
    expect(msg.params).toEqual(['srv1']);
  });

  test('parses AUTHENTICATE payload', ({ expect }) => {
    const msg = IrcProtocol.parse('AUTHENTICATE eyJ0eXAi');
    expect(msg.command).toBe('AUTHENTICATE');
    expect(msg.params).toEqual(['eyJ0eXAi']);
  });

  test('serialize round-trips a PRIVMSG', ({ expect }) => {
    const line = IrcProtocol.serialize({ command: 'PRIVMSG', params: ['#general', 'hello world'] });
    expect(line).toBe('PRIVMSG #general :hello world');
    expect(IrcProtocol.parse(line).params).toEqual(['#general', 'hello world']);
  });

  test('serialize emits a trailing param only when needed', ({ expect }) => {
    expect(IrcProtocol.serialize({ command: 'JOIN', params: ['#general'] })).toBe('JOIN #general');
    expect(IrcProtocol.serialize({ command: 'CAP', params: ['REQ', 'sasl'] })).toBe('CAP REQ :sasl');
  });
});
