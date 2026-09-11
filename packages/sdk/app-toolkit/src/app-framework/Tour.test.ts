//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { DXN, Obj, Type } from '@dxos/echo';
import { Position } from '@dxos/util';

import * as Tour from './Tour.ts';

const Widget = Type.makeObject(DXN.make('com.example.test.Widget', '0.1.0'))(Schema.Struct({ name: Schema.String }));

const group = (name: string): Tour.Step[] => [{ target: name, title: name, description: name }];

const definition = (steps: readonly Tour.Step[], position?: Position.Position): Tour.Definition => ({
  id: 'tour',
  label: 'Tour',
  matches: (data) => (data as any)?.typename === 'org.dxos.type.document',
  position,
  steps,
});

const titles = (steps: readonly Tour.Step[]) => steps.map((step) => step.title);

describe('composeSteps', () => {
  const document = { id: 'a', typename: 'org.dxos.type.document' };
  const matchesDocument: Tour.Matcher = (data) => (data as any)?.typename === 'org.dxos.type.document';

  test('a tour with no fragments is just its own steps', ({ expect }) => {
    expect(titles(Tour.composeSteps(definition(group('base')), [], document))).toEqual(['base']);
  });

  test('a matching fragment lands after the tour by default', ({ expect }) => {
    const fragment: Tour.Fragment = { matches: matchesDocument, steps: group('added') };
    expect(titles(Tour.composeSteps(definition(group('base')), [fragment], document))).toEqual(['base', 'added']);
  });

  test('position orders fragments around the tour own steps', ({ expect }) => {
    const leading: Tour.Fragment = { matches: matchesDocument, position: Position.first, steps: group('leading') };
    const trailing: Tour.Fragment = { matches: matchesDocument, position: Position.last, steps: group('trailing') };
    expect(titles(Tour.composeSteps(definition(group('base')), [trailing, leading], document))).toEqual([
      'leading',
      'base',
      'trailing',
    ]);
  });

  test('the tour own steps can be positioned too', ({ expect }) => {
    const fragment: Tour.Fragment = { matches: matchesDocument, steps: group('added') };
    expect(titles(Tour.composeSteps(definition(group('base'), Position.last), [fragment], document))).toEqual([
      'added',
      'base',
    ]);
  });

  test('a fragment that does not match the subject is left out', ({ expect }) => {
    const fragment: Tour.Fragment = { matches: (data) => (data as any)?.typename === 'other', steps: group('added') };
    expect(titles(Tour.composeSteps(definition(group('base')), [fragment], document))).toEqual(['base']);
  });

  test('fragments sharing a position keep registration order', ({ expect }) => {
    const first: Tour.Fragment = { matches: matchesDocument, steps: group('first') };
    const second: Tour.Fragment = { matches: matchesDocument, steps: group('second') };
    expect(titles(Tour.composeSteps(definition(group('base')), [first, second], document))).toEqual([
      'base',
      'first',
      'second',
    ]);
  });
});

describe('matchers', () => {
  test('whenGlobal accepts only an absent subject', ({ expect }) => {
    expect(Tour.whenGlobal(undefined)).toBe(true);
    expect(Tour.whenGlobal({})).toBe(false);
  });

  test('a type matcher rejects an absent subject, so it never reads as global', ({ expect }) => {
    expect(Tour.whenType(Widget)(undefined)).toBe(false);
  });

  test('a type matcher accepts its own type and nothing else', ({ expect }) => {
    expect(Tour.whenType(Widget)(Obj.make(Widget, { name: 'x' }))).toBe(true);
    expect(Tour.whenType(Widget)({ typename: 'org.dxos.type.document' })).toBe(false);
  });
});
