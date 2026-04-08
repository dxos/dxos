//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Obj, Type } from '@dxos/echo';

import { AppSurface } from './surface-filter';

const TypeA = Schema.Struct({ name: Schema.String }).pipe(
  Type.object({ typename: 'com.example.test.TypeA', version: '0.1.0' }),
);

const TypeB = Schema.Struct({ value: Schema.Number }).pipe(
  Type.object({ typename: 'com.example.test.TypeB', version: '0.1.0' }),
);

describe('AppSurface', () => {
  describe('subject', () => {
    test('matches single schema', ({ expect }) => {
      const filter = AppSurface.subject(TypeA);
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter({ subject: objectA })).toBe(true);
    });

    test('rejects non-matching schema', ({ expect }) => {
      const filter = AppSurface.subject(TypeA);
      const objectB = Obj.make(TypeB, { value: 42 });
      expect(filter({ subject: objectB })).toBe(false);
    });

    test('rejects non-object subject', ({ expect }) => {
      const filter = AppSurface.subject(TypeA);
      expect(filter({ subject: 'not-an-object' })).toBe(false);
      expect(filter({})).toBe(false);
    });

    test('matches with attendable option', ({ expect }) => {
      const filter = AppSurface.subject(TypeA, { attendable: true });
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter({ subject: objectA, attendableId: 'some-id' })).toBe(true);
    });

    test('rejects missing attendableId when attendable required', ({ expect }) => {
      const filter = AppSurface.subject(TypeA, { attendable: true });
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter({ subject: objectA })).toBe(false);
      expect(filter({ subject: objectA, attendableId: 123 })).toBe(false);
    });

    test('matches union of schemas', ({ expect }) => {
      const filter = AppSurface.subject([TypeA, TypeB]);
      const objectA = Obj.make(TypeA, { name: 'hello' });
      const objectB = Obj.make(TypeB, { value: 42 });
      expect(filter({ subject: objectA })).toBe(true);
      expect(filter({ subject: objectB })).toBe(true);
    });

    test('rejects non-matching schema in union', ({ expect }) => {
      const filter = AppSurface.subject([TypeA]);
      const objectB = Obj.make(TypeB, { value: 42 });
      expect(filter({ subject: objectB })).toBe(false);
    });
  });

  describe('anyObject', () => {
    test('matches any ECHO object', ({ expect }) => {
      const filter = AppSurface.anyObject();
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter({ subject: objectA })).toBe(true);
    });

    test('rejects non-ECHO values', ({ expect }) => {
      const filter = AppSurface.anyObject();
      expect(filter({ subject: 'string' })).toBe(false);
      expect(filter({ subject: null })).toBe(false);
      expect(filter({ subject: { id: '123' } })).toBe(false);
      expect(filter({})).toBe(false);
    });
  });

  describe('settings', () => {
    test('matches settings with correct prefix', ({ expect }) => {
      const filter = AppSurface.settings('dxos.org/plugin/test');
      const settingsAtom = Atom.make({});
      expect(
        filter({
          subject: {
            prefix: 'dxos.org/plugin/test',
            schema: Schema.Struct({}),
            atom: settingsAtom,
          },
        }),
      ).toBe(true);
    });

    test('rejects settings with wrong prefix', ({ expect }) => {
      const filter = AppSurface.settings('dxos.org/plugin/test');
      const settingsAtom = Atom.make({});
      expect(
        filter({
          subject: {
            prefix: 'dxos.org/plugin/other',
            schema: Schema.Struct({}),
            atom: settingsAtom,
          },
        }),
      ).toBe(false);
    });

    test('rejects non-settings values', ({ expect }) => {
      const filter = AppSurface.settings('dxos.org/plugin/test');
      expect(filter({ subject: 'not-settings' })).toBe(false);
      expect(filter({ subject: { prefix: 'test' } })).toBe(false);
    });
  });

  describe('component', () => {
    test('matches component identifier', ({ expect }) => {
      const filter = AppSurface.component('my-dialog');
      expect(filter({ component: 'my-dialog' })).toBe(true);
    });

    test('rejects non-matching identifier', ({ expect }) => {
      const filter = AppSurface.component('my-dialog');
      expect(filter({ component: 'other-dialog' })).toBe(false);
    });

    test('rejects missing component field', ({ expect }) => {
      const filter = AppSurface.component('my-dialog');
      expect(filter({ subject: 'something' })).toBe(false);
    });
  });

  describe('companion', () => {
    test('matches companion by schema', ({ expect }) => {
      const filter = AppSurface.companion(TypeA);
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter({ companionTo: objectA })).toBe(true);
    });

    test('rejects non-matching companion schema', ({ expect }) => {
      const filter = AppSurface.companion(TypeA);
      const objectB = Obj.make(TypeB, { value: 42 });
      expect(filter({ companionTo: objectB })).toBe(false);
    });

    test('matches companion with subject literal', ({ expect }) => {
      const filter = AppSurface.companion(TypeA, 'chat');
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter({ companionTo: objectA, subject: 'chat' })).toBe(true);
    });

    test('rejects wrong subject literal', ({ expect }) => {
      const filter = AppSurface.companion(TypeA, 'chat');
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter({ companionTo: objectA, subject: 'comments' })).toBe(false);
    });

    test('rejects missing companionTo', ({ expect }) => {
      const filter = AppSurface.companion(TypeA);
      expect(filter({ subject: 'chat' })).toBe(false);
    });
  });
});
