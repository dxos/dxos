//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { DXN, Obj, Type } from '@dxos/echo';
import { Position } from '@dxos/util';

import * as Tour from './Tour.ts';

const Widget = Type.makeObject(DXN.make('com.example.test.Widget', '0.1.0'))(Schema.Struct({ name: Schema.String }));

const loader = (name: string) => async () => [{ target: name, title: name, description: name }];

const definition = (steps: () => Promise<readonly Tour.Step[]>, position?: Position.Position): Tour.Definition => ({
  id: 'tour',
  label: 'Tour',
  matches: (data) => (data as any)?.typename === 'org.dxos.type.document',
  position,
  steps,
});

const titles = async (loaders: readonly (() => Promise<readonly Tour.Step[]>)[]) =>
  (await Promise.all(loaders.map((load) => load()))).flat().map((step) => step.title);

describe('stepLoaders', () => {
  const document = { id: 'a', typename: 'org.dxos.type.document' };
  const matchesDocument: Tour.Matcher = (data) => (data as any)?.typename === 'org.dxos.type.document';

  test('a tour with no fragments is just its own steps', async ({ expect }) => {
    expect(await titles(Tour.stepLoaders(definition(loader('base')), [], document))).toEqual(['base']);
  });

  test('a matching fragment lands after the tour by default', async ({ expect }) => {
    const fragment: Tour.Fragment = { matches: matchesDocument, steps: loader('added') };
    expect(await titles(Tour.stepLoaders(definition(loader('base')), [fragment], document))).toEqual(['base', 'added']);
  });

  test('position orders fragments around the tour own steps', async ({ expect }) => {
    const leading: Tour.Fragment = { matches: matchesDocument, position: Position.first, steps: loader('leading') };
    const trailing: Tour.Fragment = { matches: matchesDocument, position: Position.last, steps: loader('trailing') };
    expect(await titles(Tour.stepLoaders(definition(loader('base')), [trailing, leading], document))).toEqual([
      'leading',
      'base',
      'trailing',
    ]);
  });

  test('the tour own steps can be positioned too', async ({ expect }) => {
    const fragment: Tour.Fragment = { matches: matchesDocument, steps: loader('added') };
    expect(await titles(Tour.stepLoaders(definition(loader('base'), Position.last), [fragment], document))).toEqual([
      'added',
      'base',
    ]);
  });

  test('a fragment that does not match the subject is left out', async ({ expect }) => {
    const fragment: Tour.Fragment = { matches: (data) => (data as any)?.typename === 'other', steps: loader('added') };
    expect(await titles(Tour.stepLoaders(definition(loader('base')), [fragment], document))).toEqual(['base']);
  });

  test('fragments sharing a position keep registration order', async ({ expect }) => {
    const first: Tour.Fragment = { matches: matchesDocument, steps: loader('first') };
    const second: Tour.Fragment = { matches: matchesDocument, steps: loader('second') };
    expect(await titles(Tour.stepLoaders(definition(loader('base')), [first, second], document))).toEqual([
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
