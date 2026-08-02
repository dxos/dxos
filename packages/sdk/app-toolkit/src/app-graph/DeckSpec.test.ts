//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { AppAnnotation } from '../echo';
import * as DeckSpec from './DeckSpec';

const mailbox: DeckSpec.DeckSpec = {
  levels: [{ key: 'mailbox', size: 'fill' }, { key: 'message', size: 'fill' }, { key: 'attachment' }],
};

describe('fromNode', () => {
  test('reads a declared spec', ({ expect }) => {
    expect(DeckSpec.fromNode(node(mailbox))).toEqual(mailbox);
  });

  test('returns undefined when the node declares none', ({ expect }) => {
    expect(DeckSpec.fromNode({ properties: {} })).toBeUndefined();
    expect(DeckSpec.fromNode(undefined)).toBeUndefined();
  });

  // `properties` is an untyped bag any plugin can write, so a malformed spec has to read as "no spec"
  // rather than reaching the deck's geometry.
  test('rejects a malformed spec rather than passing it through', ({ expect }) => {
    expect(DeckSpec.fromNode(node({ levels: 'nope' }))).toBeUndefined();
    expect(DeckSpec.fromNode(node({ levels: [{ size: 'fill' }] }))).toBeUndefined();
    expect(DeckSpec.fromNode(node({ levels: [{ key: 'message', size: 'wide' }] }))).toBeUndefined();
    expect(DeckSpec.fromNode(node('mailbox'))).toBeUndefined();
  });

  test('accepts a spec with no levels', ({ expect }) => {
    expect(DeckSpec.fromNode(node({ initial: 'children' }))).toEqual({ initial: 'children' });
  });

  // A duplicate key would make two rungs share one plank name, so level resolution and pruning
  // become ambiguous.
  test('rejects duplicate level keys', ({ expect }) => {
    expect(DeckSpec.fromNode(node({ levels: [{ key: 'message' }, { key: 'message' }] }))).toBeUndefined();
  });
});

describe('plankName / levelOf', () => {
  test('round-trips a level through its plank name', ({ expect }) => {
    const name = DeckSpec.plankName('inbox-1', 'message');
    expect(name).toBe('inbox-1/message');
    expect(DeckSpec.levelOf(mailbox, 'inbox-1', name)).toBe('message');
  });

  test('ignores names belonging to another root', ({ expect }) => {
    expect(DeckSpec.levelOf(mailbox, 'inbox-1', 'inbox-2/message')).toBeUndefined();
  });

  test('ignores names that are not a declared level', ({ expect }) => {
    expect(DeckSpec.levelOf(mailbox, 'inbox-1', 'inbox-1/draft')).toBeUndefined();
    expect(DeckSpec.levelOf(mailbox, 'inbox-1', undefined)).toBeUndefined();
    expect(DeckSpec.levelOf(undefined, 'inbox-1', 'inbox-1/message')).toBeUndefined();
  });

  // A root id containing the separator must not let a nested name masquerade as a level.
  test('does not confuse a nested root id for a level', ({ expect }) => {
    expect(DeckSpec.levelOf(mailbox, 'inbox-1', 'inbox-1/thread/message')).toBeUndefined();
  });
});

describe('levelsBelow', () => {
  test('lists the levels an open at this level closes', ({ expect }) => {
    expect(DeckSpec.levelsBelow(mailbox, 'mailbox').map(({ key }) => key)).toEqual(['message', 'attachment']);
    expect(DeckSpec.levelsBelow(mailbox, 'message').map(({ key }) => key)).toEqual(['attachment']);
  });

  test('the deepest level closes nothing', ({ expect }) => {
    expect(DeckSpec.levelsBelow(mailbox, 'attachment')).toEqual([]);
  });

  test('an unknown level closes nothing', ({ expect }) => {
    expect(DeckSpec.levelsBelow(mailbox, 'nope')).toEqual([]);
    expect(DeckSpec.levelsBelow(undefined, 'message')).toEqual([]);
  });
});

describe('DeckAnnotation', () => {
  // The load-bearing claim of the mechanism: a plugin declares the spec on its type and the graph
  // reads it back. Guards the module-init cycle between AppAnnotation and this module too — a bad
  // import order leaves the annotation's schema undefined and this fails rather than the app.
  test('round-trips a spec declared on a schema', ({ expect }) => {
    const schema = Schema.Struct({ id: Schema.String }).pipe(AppAnnotation.DeckAnnotation.set(mailbox));
    expect(Option.getOrUndefined(AppAnnotation.DeckAnnotation.get(schema))).toEqual(mailbox);
  });

  test('a schema without the annotation reads as none', ({ expect }) => {
    expect(
      Option.getOrUndefined(AppAnnotation.DeckAnnotation.get(Schema.Struct({ id: Schema.String }))),
    ).toBeUndefined();
  });
});

const node = (deck: unknown) => ({ properties: { deck } });
