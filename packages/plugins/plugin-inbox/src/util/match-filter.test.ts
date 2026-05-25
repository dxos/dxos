//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Tag } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { Message } from '@dxos/types';

import { matchesFilter } from './match-filter';

const tagFoo = Tag.make({ label: 'foo' });
const tagBar = Tag.make({ label: 'bar' });
const tags: Tag.Map = { [tagFoo.id]: tagFoo, [tagBar.id]: tagBar };

const makeMessage = (overrides: Partial<Message.Message>): Message.Message =>
  ({
    id: 'msg_1',
    created: '2026-01-01T00:00:00Z',
    sender: { name: 'Rich', email: 'rich@dxos.org' },
    blocks: [{ _tag: 'text', text: 'Hello world' }],
    properties: { subject: 'Project update', to: 'team@dxos.org' },
    ...overrides,
  }) as unknown as Message.Message;

describe('matchesFilter', () => {
  const builder = new QueryBuilder(tags);
  const build = (input: string) => {
    const { filter } = builder.build(input);
    if (!filter) {
      throw new Error(`Failed to build filter from input: ${input}`);
    }
    return filter;
  };

  test('property filter matches sender email', ({ expect }) => {
    const message = makeMessage({});
    expect(matchesFilter(build('sender.email:rich@dxos.org'), message, [])).toBe(true);
    expect(matchesFilter(build('sender.email:other@dxos.org'), message, [])).toBe(false);
  });

  test('string property filter matches case-insensitive substring', ({ expect }) => {
    const message = makeMessage({});
    expect(matchesFilter(build('sender.email:RICH'), message, [])).toBe(true);
    expect(matchesFilter(build('sender.name:rich'), message, [])).toBe(true);
  });

  test('property filter on object value matches any field', ({ expect }) => {
    const message = makeMessage({});
    // `sender` is an Actor — should match if any of its fields contain the query.
    expect(matchesFilter(build('sender:rich'), message, [])).toBe(true);
    expect(matchesFilter(build('sender:dxos.org'), message, [])).toBe(true);
    expect(matchesFilter(build('sender:absent'), message, [])).toBe(false);
  });

  test('from: alias maps to sender', ({ expect }) => {
    const message = makeMessage({});
    expect(matchesFilter(build('from:rich'), message, [])).toBe(true);
    expect(matchesFilter(build('from.email:rich@dxos.org'), message, [])).toBe(true);
    expect(matchesFilter(build('from.name:Rich'), message, [])).toBe(true);
    expect(matchesFilter(build('from:absent'), message, [])).toBe(false);
  });

  test('to: alias maps to properties.to', ({ expect }) => {
    const message = makeMessage({});
    expect(matchesFilter(build('to:team@dxos.org'), message, [])).toBe(true);
    expect(matchesFilter(build('to:team'), message, [])).toBe(true);
    expect(matchesFilter(build('to:absent'), message, [])).toBe(false);
  });

  test('text fragment matches subject substring', ({ expect }) => {
    const message = makeMessage({});
    expect(matchesFilter(build('project'), message, [])).toBe(true);
    expect(matchesFilter(build('absent'), message, [])).toBe(false);
  });

  test('text fragment matches block content', ({ expect }) => {
    const message = makeMessage({});
    expect(matchesFilter(build('hello'), message, [])).toBe(true);
  });

  test('multiple fragments are AND-joined', ({ expect }) => {
    const message = makeMessage({});
    expect(matchesFilter(build('project hello'), message, [])).toBe(true);
    expect(matchesFilter(build('project absent'), message, [])).toBe(false);
  });

  test('property + text fragment combined', ({ expect }) => {
    const message = makeMessage({});
    expect(matchesFilter(build('sender.email:rich@dxos.org project'), message, [])).toBe(true);
    expect(matchesFilter(build('sender.email:other@dxos.org project'), message, [])).toBe(false);
  });

  test('tag filter matches via passed tags', ({ expect }) => {
    const message = makeMessage({});
    expect(matchesFilter(build('#foo'), message, [tagFoo])).toBe(true);
    expect(matchesFilter(build('#foo'), message, [tagBar])).toBe(false);
  });

  test('OR matches either', ({ expect }) => {
    const message = makeMessage({});
    expect(matchesFilter(build('absent OR project'), message, [])).toBe(true);
    expect(matchesFilter(build('absent OR missing'), message, [])).toBe(false);
  });

  test('NOT inverts', ({ expect }) => {
    const message = makeMessage({});
    expect(matchesFilter(build('NOT absent'), message, [])).toBe(true);
    expect(matchesFilter(build('NOT project'), message, [])).toBe(false);
  });
});
