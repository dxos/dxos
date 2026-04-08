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
  describe('anyObjectSection', () => {
    test('matches any ECHO object', ({ expect }) => {
      const filter = AppSurface.anyObjectSection();
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter({ subject: objectA })).toBe(true);
    });

    test('rejects non-ECHO values', ({ expect }) => {
      const filter = AppSurface.anyObjectSection();
      expect(filter({ subject: 'string' })).toBe(false);
      expect(filter({ subject: null })).toBe(false);
      expect(filter({ subject: { id: '123' } })).toBe(false);
      expect(filter({})).toBe(false);
    });
  });

  describe('settingsArticle', () => {
    test('matches settings with correct prefix', ({ expect }) => {
      const filter = AppSurface.settingsArticle('dxos.org/plugin/test');
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
      const filter = AppSurface.settingsArticle('dxos.org/plugin/test');
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
      const filter = AppSurface.settingsArticle('dxos.org/plugin/test');
      expect(filter({ subject: 'not-settings' })).toBe(false);
      expect(filter({ subject: { prefix: 'test' } })).toBe(false);
    });
  });

  describe('componentDialog', () => {
    test('matches component identifier', ({ expect }) => {
      const filter = AppSurface.componentDialog('my-dialog');
      expect(filter({ component: 'my-dialog' })).toBe(true);
    });

    test('rejects non-matching identifier', ({ expect }) => {
      const filter = AppSurface.componentDialog('my-dialog');
      expect(filter({ component: 'other-dialog' })).toBe(false);
    });

    test('rejects missing component field', ({ expect }) => {
      const filter = AppSurface.componentDialog('my-dialog');
      expect(filter({ subject: 'something' })).toBe(false);
    });
  });

  describe('companionArticle', () => {
    test('matches typed companion', ({ expect }) => {
      const filter = AppSurface.companionArticle(TypeA);
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter({ companionTo: objectA })).toBe(true);
    });

    test('rejects wrong companion type', ({ expect }) => {
      const filter = AppSurface.companionArticle(TypeA);
      const objectB = Obj.make(TypeB, { value: 42 });
      expect(filter({ companionTo: objectB })).toBe(false);
    });

    test('matches any companion (no args)', ({ expect }) => {
      const filter = AppSurface.companionArticle();
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter({ companionTo: objectA })).toBe(true);
      expect(filter({})).toBe(false);
    });

    test('matches string literal companion', ({ expect }) => {
      const filter = AppSurface.companionArticle('feeds-root');
      expect(filter({ companionTo: 'feeds-root' })).toBe(true);
      expect(filter({ companionTo: 'other' })).toBe(false);
    });

    test('composes with objectArticle via and()', ({ expect }) => {
      const filter = AppSurface.and(AppSurface.objectArticle(TypeA), AppSurface.companionArticle(TypeB));
      const objectA = Obj.make(TypeA, { name: 'hello' });
      const objectB = Obj.make(TypeB, { value: 42 });
      expect(filter({ subject: objectA, companionTo: objectB, attendableId: 'id' })).toBe(true);
      expect(filter({ subject: objectA, companionTo: objectA, attendableId: 'id' })).toBe(false);
    });

    test('composes with literalArticle via and()', ({ expect }) => {
      const filter = AppSurface.and(AppSurface.literalArticle('chat'), AppSurface.companionArticle(TypeA));
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter({ subject: 'chat', companionTo: objectA, attendableId: 'id' })).toBe(true);
      expect(filter({ subject: 'chat', attendableId: 'id' })).toBe(false);
    });
  });

  describe('literalArticle', () => {
    test('matches literal subject', ({ expect }) => {
      const filter = AppSurface.literalArticle('chat');
      expect(filter({ subject: 'chat', attendableId: 'id' })).toBe(true);
    });

    test('rejects wrong literal', ({ expect }) => {
      const filter = AppSurface.literalArticle('chat');
      expect(filter({ subject: 'other', attendableId: 'id' })).toBe(false);
    });

    test('rejects missing attendableId', ({ expect }) => {
      const filter = AppSurface.literalArticle('chat');
      expect(filter({ subject: 'chat' })).toBe(false);
    });
  });

  describe('literalSection', () => {
    test('matches string literal', ({ expect }) => {
      const filter = AppSurface.literalSection('chat');
      expect(filter({ subject: 'chat' })).toBe(true);
    });

    test('rejects non-matching string', ({ expect }) => {
      const filter = AppSurface.literalSection('chat');
      expect(filter({ subject: 'comments' })).toBe(false);
    });

    test('matches null literal', ({ expect }) => {
      const filter = AppSurface.literalSection(null);
      expect(filter({ subject: null })).toBe(true);
    });

    test('rejects non-null when null expected', ({ expect }) => {
      const filter = AppSurface.literalSection(null);
      expect(filter({ subject: 'chat' })).toBe(false);
    });

    test('rejects ECHO objects', ({ expect }) => {
      const filter = AppSurface.literalSection('chat');
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter({ subject: objectA })).toBe(false);
    });
  });

  describe('graphNodeSection', () => {
    test('matches graph node', ({ expect }) => {
      const filter = AppSurface.graphNodeSection();
      const node = { id: 'test', type: 'test', properties: {}, data: {} };
      expect(filter({ subject: node })).toBe(true);
    });

    test('rejects non-node values', ({ expect }) => {
      const filter = AppSurface.graphNodeSection();
      expect(filter({ subject: 'string' })).toBe(false);
      expect(filter({ subject: { id: 'test' } })).toBe(false);
      expect(filter({})).toBe(false);
    });
  });

  describe('pluginSection', () => {
    test('matches plugin descriptor', ({ expect }) => {
      const filter = AppSurface.pluginSection();
      const pluginObj = { [Symbol.for('@dxos/app-framework/Plugin')]: Symbol.for('@dxos/app-framework/Plugin') };
      expect(filter({ subject: pluginObj })).toBe(true);
    });

    test('rejects non-plugin values', ({ expect }) => {
      const filter = AppSurface.pluginSection();
      expect(filter({ subject: 'string' })).toBe(false);
      expect(filter({ subject: { meta: {} } })).toBe(false);
      expect(filter({})).toBe(false);
    });
  });

  describe('schemaSection', () => {
    test('matches ECHO object schema', ({ expect }) => {
      const filter = AppSurface.schemaSection();
      expect(filter({ subject: TypeA })).toBe(true);
      expect(filter({ subject: TypeB })).toBe(true);
    });

    test('rejects non-schema values', ({ expect }) => {
      const filter = AppSurface.schemaSection();
      expect(filter({ subject: 'string' })).toBe(false);
      expect(filter({ subject: { typename: 'fake' } })).toBe(false);
      expect(filter({})).toBe(false);
    });

    test('rejects ECHO object instances', ({ expect }) => {
      const filter = AppSurface.schemaSection();
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter({ subject: objectA })).toBe(false);
    });
  });

  describe('snapshotSection', () => {
    test('matches snapshot of correct type', ({ expect }) => {
      const filter = AppSurface.snapshotSection(TypeA);
      const objectA = Obj.make(TypeA, { name: 'hello' });
      const snap = Obj.getSnapshot(objectA);
      expect(filter({ subject: snap })).toBe(true);
    });

    test('rejects snapshot of wrong type', ({ expect }) => {
      const filter = AppSurface.snapshotSection(TypeA);
      const objectB = Obj.make(TypeB, { value: 42 });
      const snap = Obj.getSnapshot(objectB);
      expect(filter({ subject: snap })).toBe(false);
    });

    test('rejects live ECHO objects', ({ expect }) => {
      const filter = AppSurface.snapshotSection(TypeA);
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter({ subject: objectA })).toBe(false);
    });

    test('rejects non-objects', ({ expect }) => {
      const filter = AppSurface.snapshotSection(TypeA);
      expect(filter({ subject: 'string' })).toBe(false);
      expect(filter({})).toBe(false);
    });
  });

  describe('and', () => {
    test('combines two section filters', ({ expect }) => {
      const filter = AppSurface.and(AppSurface.objectSection(TypeA), AppSurface.literalSection('test'));
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter({ subject: objectA })).toBe(false);
    });
  });

  describe('objectArticle', () => {
    test('matches with attendableId', ({ expect }) => {
      const filter = AppSurface.objectArticle(TypeA);
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter({ subject: objectA, attendableId: 'id' })).toBe(true);
    });

    test('rejects missing attendableId', ({ expect }) => {
      const filter = AppSurface.objectArticle(TypeA);
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter({ subject: objectA })).toBe(false);
    });

    test('rejects wrong schema', ({ expect }) => {
      const filter = AppSurface.objectArticle(TypeA);
      const objectB = Obj.make(TypeB, { value: 42 });
      expect(filter({ subject: objectB, attendableId: 'id' })).toBe(false);
    });

    test('matches union', ({ expect }) => {
      const filter = AppSurface.objectArticle([TypeA, TypeB]);
      const objectB = Obj.make(TypeB, { value: 42 });
      expect(filter({ subject: objectB, attendableId: 'id' })).toBe(true);
    });
  });

  describe('objectCard', () => {
    test('matches without attendableId', ({ expect }) => {
      const filter = AppSurface.objectCard(TypeA);
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter({ subject: objectA })).toBe(true);
    });

    test('rejects wrong schema', ({ expect }) => {
      const filter = AppSurface.objectCard(TypeA);
      const objectB = Obj.make(TypeB, { value: 42 });
      expect(filter({ subject: objectB })).toBe(false);
    });
  });

  describe('objectSection', () => {
    test('matches without attendableId', ({ expect }) => {
      const filter = AppSurface.objectSection(TypeA);
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter({ subject: objectA })).toBe(true);
    });
  });

  describe('objectSettings', () => {
    test('matches', ({ expect }) => {
      const filter = AppSurface.objectSettings(TypeA);
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter({ subject: objectA })).toBe(true);
    });
  });
});
