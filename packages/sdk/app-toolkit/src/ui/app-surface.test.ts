//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Obj, Type } from '@dxos/echo';

import * as AppSurface from './app-surface';

const TypeA = Schema.Struct({ name: Schema.String }).pipe(
  Type.object({ typename: 'com.example.test.TypeA', version: '0.1.0' }),
);

const TypeB = Schema.Struct({ value: Schema.Number }).pipe(
  Type.object({ typename: 'com.example.test.TypeB', version: '0.1.0' }),
);

describe('AppSurface', () => {
  describe('object', () => {
    test('matches single schema', ({ expect }) => {
      const filter = AppSurface.object(TypeA);
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter({ subject: objectA })).toBe(true);
    });

    test('rejects non-matching schema', ({ expect }) => {
      const filter = AppSurface.object(TypeA);
      const objectB = Obj.make(TypeB, { value: 42 });
      expect(filter({ subject: objectB })).toBe(false);
    });

    test('rejects non-object subject', ({ expect }) => {
      const filter = AppSurface.object(TypeA);
      expect(filter({ subject: 'not-an-object' })).toBe(false);
      expect(filter({})).toBe(false);
    });

    test('matches with attendable option', ({ expect }) => {
      const filter = AppSurface.object(TypeA, { attendable: true });
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter({ subject: objectA, attendableId: 'some-id' })).toBe(true);
    });

    test('rejects missing attendableId when attendable required', ({ expect }) => {
      const filter = AppSurface.object(TypeA, { attendable: true });
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter({ subject: objectA })).toBe(false);
      expect(filter({ subject: objectA, attendableId: 123 })).toBe(false);
    });

    test('matches union of schemas', ({ expect }) => {
      const filter = AppSurface.object([TypeA, TypeB]);
      const objectA = Obj.make(TypeA, { name: 'hello' });
      const objectB = Obj.make(TypeB, { value: 42 });
      expect(filter({ subject: objectA })).toBe(true);
      expect(filter({ subject: objectB })).toBe(true);
    });

    test('rejects non-matching schema in union', ({ expect }) => {
      const filter = AppSurface.object([TypeA]);
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

  describe('literal', () => {
    test('matches string literal', ({ expect }) => {
      const filter = AppSurface.literal('chat');
      expect(filter({ subject: 'chat' })).toBe(true);
    });

    test('rejects non-matching string', ({ expect }) => {
      const filter = AppSurface.literal('chat');
      expect(filter({ subject: 'comments' })).toBe(false);
    });

    test('matches null literal', ({ expect }) => {
      const filter = AppSurface.literal(null);
      expect(filter({ subject: null })).toBe(true);
    });

    test('rejects non-null when null expected', ({ expect }) => {
      const filter = AppSurface.literal(null);
      expect(filter({ subject: 'chat' })).toBe(false);
    });

    test('rejects ECHO objects', ({ expect }) => {
      const filter = AppSurface.literal('chat');
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter({ subject: objectA })).toBe(false);
    });
  });

  describe('graphNode', () => {
    test('matches graph node', ({ expect }) => {
      const filter = AppSurface.graphNode();
      const node = { id: 'test', type: 'test', properties: {}, data: {} };
      expect(filter({ subject: node })).toBe(true);
    });

    test('rejects non-node values', ({ expect }) => {
      const filter = AppSurface.graphNode();
      expect(filter({ subject: 'string' })).toBe(false);
      expect(filter({ subject: { id: 'test' } })).toBe(false);
      expect(filter({})).toBe(false);
    });
  });

  describe('plugin', () => {
    test('rejects non-plugin values', ({ expect }) => {
      const filter = AppSurface.plugin();
      expect(filter({ subject: 'string' })).toBe(false);
      expect(filter({ subject: { meta: {} } })).toBe(false);
      expect(filter({})).toBe(false);
    });
  });

  describe('schema', () => {
    test('matches ECHO object schema', ({ expect }) => {
      const filter = AppSurface.schema();
      expect(filter({ subject: TypeA })).toBe(true);
      expect(filter({ subject: TypeB })).toBe(true);
    });

    test('rejects non-schema values', ({ expect }) => {
      const filter = AppSurface.schema();
      expect(filter({ subject: 'string' })).toBe(false);
      expect(filter({ subject: { typename: 'fake' } })).toBe(false);
      expect(filter({})).toBe(false);
    });

    test('rejects ECHO object instances', ({ expect }) => {
      const filter = AppSurface.schema();
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter({ subject: objectA })).toBe(false);
    });
  });

  describe('snapshot', () => {
    test('matches snapshot of correct type', ({ expect }) => {
      const filter = AppSurface.snapshot(TypeA);
      const objectA = Obj.make(TypeA, { name: 'hello' });
      const snap = Obj.getSnapshot(objectA);
      expect(filter({ subject: snap })).toBe(true);
    });

    test('rejects snapshot of wrong type', ({ expect }) => {
      const filter = AppSurface.snapshot(TypeA);
      const objectB = Obj.make(TypeB, { value: 42 });
      const snap = Obj.getSnapshot(objectB);
      expect(filter({ subject: snap })).toBe(false);
    });

    test('rejects live ECHO objects', ({ expect }) => {
      const filter = AppSurface.snapshot(TypeA);
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter({ subject: objectA })).toBe(false);
    });

    test('rejects non-objects', ({ expect }) => {
      const filter = AppSurface.snapshot(TypeA);
      expect(filter({ subject: 'string' })).toBe(false);
      expect(filter({})).toBe(false);
    });
  });

  describe('companion (no-arg)', () => {
    test('matches any ECHO object as companionTo', ({ expect }) => {
      const filter = AppSurface.companion();
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter({ companionTo: objectA })).toBe(true);
    });

    test('rejects non-ECHO companionTo', ({ expect }) => {
      const filter = AppSurface.companion();
      expect(filter({ companionTo: 'string' })).toBe(false);
      expect(filter({})).toBe(false);
    });
  });

  describe('and', () => {
    test('combines object + companion filters', ({ expect }) => {
      const filter = AppSurface.and(AppSurface.object(TypeA), AppSurface.companion(TypeB));
      const objectA = Obj.make(TypeA, { name: 'hello' });
      const objectB = Obj.make(TypeB, { value: 42 });
      expect(filter({ subject: objectA, companionTo: objectB })).toBe(true);
    });

    test('rejects when first filter fails', ({ expect }) => {
      const filter = AppSurface.and(AppSurface.object(TypeA), AppSurface.companion(TypeB));
      const objectB = Obj.make(TypeB, { value: 42 });
      expect(filter({ subject: objectB, companionTo: objectB })).toBe(false);
    });

    test('rejects when second filter fails', ({ expect }) => {
      const filter = AppSurface.and(AppSurface.object(TypeA), AppSurface.companion(TypeB));
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter({ subject: objectA, companionTo: objectA })).toBe(false);
    });

    test('combines literal + no-arg companion', ({ expect }) => {
      const filter = AppSurface.and(AppSurface.literal('comments'), AppSurface.companion());
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter({ subject: 'comments', companionTo: objectA })).toBe(true);
      expect(filter({ subject: 'other', companionTo: objectA })).toBe(false);
      expect(filter({ subject: 'comments' })).toBe(false);
    });
  });
});
