//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Surface as SurfaceInternals } from '@dxos/app-framework/ui';
import { Obj, Type } from '@dxos/echo';

import * as AppSurface from './app-surface';

const TypeA = Schema.Struct({ name: Schema.String }).pipe(
  Type.object({ typename: 'com.example.test.TypeA', version: '0.1.0' }),
);

const TypeB = Schema.Struct({ value: Schema.Number }).pipe(
  Type.object({ typename: 'com.example.test.TypeB', version: '0.1.0' }),
);

describe('AppSurface', () => {
  //
  // Typed role-binding API
  //

  describe('role tokens', () => {
    test('expose their role string', ({ expect }) => {
      expect(AppSurface.Article.role).toBe('article');
      expect(AppSurface.Section.role).toBe('section');
      expect(AppSurface.Card.role).toBe('card--content');
      expect(AppSurface.Slide.role).toBe('slide');
      expect(AppSurface.Dialog.role).toBe('dialog');
      expect(AppSurface.Popover.role).toBe('popover');
      expect(AppSurface.Navigation.role).toBe('navigation');
    });
  });

  describe('object(token, schema)', () => {
    test('produces a single binding at the token role', ({ expect }) => {
      const filter = AppSurface.object(AppSurface.Article, TypeA);
      expect(filter.bindings).toHaveLength(1);
      expect(filter.bindings[0].role).toBe('article');
    });

    test('article token preserves attendableId requirement', ({ expect }) => {
      const filter = AppSurface.object(AppSurface.Article, TypeA);
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter.bindings[0].guard({ subject: objectA, attendableId: 'id' })).toBe(true);
      expect(filter.bindings[0].guard({ subject: objectA })).toBe(false);
    });

    test('section token also requires attendableId (sections render inside planks)', ({ expect }) => {
      const filter = AppSurface.object(AppSurface.Section, TypeA);
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter.bindings[0].guard({ subject: objectA, attendableId: 'id' })).toBe(true);
      expect(filter.bindings[0].guard({ subject: objectA })).toBe(false);
    });

    test('card token does not require attendableId', ({ expect }) => {
      const filter = AppSurface.object(AppSurface.Card, TypeA);
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter.bindings[0].guard({ subject: objectA })).toBe(true);
    });

    test('accepts an array of schemas (union)', ({ expect }) => {
      const filter = AppSurface.object(AppSurface.Card, [TypeA, TypeB]);
      const objectA = Obj.make(TypeA, { name: 'hi' });
      const objectB = Obj.make(TypeB, { value: 1 });
      expect(filter.bindings[0].guard({ subject: objectA })).toBe(true);
      expect(filter.bindings[0].guard({ subject: objectB })).toBe(true);
    });

    test('rejects mismatched subjects', ({ expect }) => {
      const filter = AppSurface.object(AppSurface.Card, TypeA);
      const objectB = Obj.make(TypeB, { value: 1 });
      expect(filter.bindings[0].guard({ subject: objectB })).toBe(false);
    });
  });

  describe('component(token, id)', () => {
    test('matches on data.component equality', ({ expect }) => {
      const filter = AppSurface.component(AppSurface.Dialog, 'my-dialog');
      expect(filter.bindings[0].role).toBe('dialog');
      expect(filter.bindings[0].guard({ component: 'my-dialog' })).toBe(true);
      expect(filter.bindings[0].guard({ component: 'other' })).toBe(false);
      expect(filter.bindings[0].guard({})).toBe(false);
    });

    test('works for popover token too', ({ expect }) => {
      const filter = AppSurface.component(AppSurface.Popover, 'anchor-menu');
      expect(filter.bindings[0].role).toBe('popover');
      expect(filter.bindings[0].guard({ component: 'anchor-menu' })).toBe(true);
    });
  });

  describe('settings(token, prefix)', () => {
    test('matches article-role settings with prefix', ({ expect }) => {
      const filter = AppSurface.settings(AppSurface.Article, 'dxos.org/plugin/test');
      const settingsAtom = Atom.make({});
      expect(filter.bindings[0].role).toBe('article');
      expect(
        filter.bindings[0].guard({
          subject: {
            prefix: 'dxos.org/plugin/test',
            schema: Schema.Struct({}),
            atom: settingsAtom,
          },
        }),
      ).toBe(true);
      expect(
        filter.bindings[0].guard({
          subject: {
            prefix: 'dxos.org/plugin/other',
            schema: Schema.Struct({}),
            atom: settingsAtom,
          },
        }),
      ).toBe(false);
    });
  });

  describe('predicate(token, fn)', () => {
    test('lifts an ad-hoc predicate into a SurfaceFilter', ({ expect }) => {
      const filter = AppSurface.predicate(AppSurface.Article, (data: any) => data.custom === true);
      expect(filter.bindings[0].role).toBe('article');
      expect(filter.bindings[0].guard({ custom: true })).toBe(true);
      expect(filter.bindings[0].guard({ custom: false })).toBe(false);
    });

    test('traps thrown errors and returns false', ({ expect }) => {
      const filter = AppSurface.predicate(AppSurface.Article, () => {
        throw new Error('boom');
      });
      expect(filter.bindings[0].guard({})).toBe(false);
    });
  });

  describe('oneOf', () => {
    test('concatenates bindings across filters', ({ expect }) => {
      const filter = AppSurface.oneOf(
        AppSurface.object(AppSurface.Article, TypeA),
        AppSurface.object(AppSurface.Section, TypeA),
        AppSurface.object(AppSurface.Slide, TypeA),
      );
      expect(filter.bindings).toHaveLength(3);
      expect(filter.bindings.map((binding) => binding.role)).toEqual(['article', 'section', 'slide']);
    });

    test('preserves per-binding guard behavior', ({ expect }) => {
      const filter = AppSurface.oneOf(
        AppSurface.object(AppSurface.Article, TypeA),
        AppSurface.object(AppSurface.Card, TypeB),
      );
      const objectA = Obj.make(TypeA, { name: 'hi' });
      const objectB = Obj.make(TypeB, { value: 1 });
      // Article binding requires attendableId; Card binding does not.
      expect(filter.bindings[0].guard({ subject: objectA, attendableId: 'id' })).toBe(true);
      expect(filter.bindings[0].guard({ subject: objectB, attendableId: 'id' })).toBe(false);
      expect(filter.bindings[1].guard({ subject: objectB })).toBe(true);
      expect(filter.bindings[1].guard({ subject: objectA })).toBe(false);
    });
  });

  describe('and (typed form)', () => {
    test('combines same-role filters with AND semantics', ({ expect }) => {
      const filter = AppSurface.allOf(
        AppSurface.object(AppSurface.Article, TypeA),
        AppSurface.predicate(AppSurface.Article, (data: any) => data.extra === true),
      );
      expect(filter.bindings).toHaveLength(1);
      expect(filter.bindings[0].role).toBe('article');
      const objectA = Obj.make(TypeA, { name: 'hi' });
      expect(filter.bindings[0].guard({ subject: objectA, attendableId: 'id', extra: true })).toBe(true);
      expect(filter.bindings[0].guard({ subject: objectA, attendableId: 'id', extra: false })).toBe(false);
    });

    test('throws when filters have different role sets', ({ expect }) => {
      expect(() =>
        AppSurface.allOf(AppSurface.object(AppSurface.Article, TypeA), AppSurface.object(AppSurface.Section, TypeA)),
      ).toThrow(/same role set/);
    });

    test('literal + companion compose via typed allOf', ({ expect }) => {
      const filter = AppSurface.allOf(
        AppSurface.literal(AppSurface.Article, 'chat'),
        AppSurface.companion(AppSurface.Article, TypeA),
      );
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter.bindings).toHaveLength(1);
      expect(filter.bindings[0].role).toBe('article');
      expect(filter.bindings[0].guard({ subject: 'chat', companionTo: objectA, attendableId: 'id' })).toBe(true);
      expect(filter.bindings[0].guard({ subject: 'other', companionTo: objectA, attendableId: 'id' })).toBe(false);
    });
  });

  describe('literal', () => {
    test('matches subject string', ({ expect }) => {
      const filter = AppSurface.literal(AppSurface.Article, 'chat');
      expect(filter.bindings[0].guard({ subject: 'chat', attendableId: 'id' })).toBe(true);
      expect(filter.bindings[0].guard({ subject: 'other', attendableId: 'id' })).toBe(false);
    });

    test('matches null subject', ({ expect }) => {
      const filter = AppSurface.literal(AppSurface.Section, null);
      expect(filter.bindings[0].guard({ subject: null, attendableId: 'id' })).toBe(true);
      expect(filter.bindings[0].guard({ subject: 'chat', attendableId: 'id' })).toBe(false);
    });
  });

  describe('companion', () => {
    test('matches typed companion', ({ expect }) => {
      const filter = AppSurface.companion(AppSurface.Article, TypeA);
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter.bindings[0].guard({ companionTo: objectA })).toBe(true);
    });

    test('rejects wrong companion type', ({ expect }) => {
      const filter = AppSurface.companion(AppSurface.Article, TypeA);
      const objectB = Obj.make(TypeB, { value: 42 });
      expect(filter.bindings[0].guard({ companionTo: objectB })).toBe(false);
    });

    test('matches any companion (no args)', ({ expect }) => {
      const filter = AppSurface.companion(AppSurface.Article);
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter.bindings[0].guard({ companionTo: objectA })).toBe(true);
      expect(filter.bindings[0].guard({})).toBe(false);
    });

    test('matches string literal companion', ({ expect }) => {
      const filter = AppSurface.companion(AppSurface.Article, 'feeds-root');
      expect(filter.bindings[0].guard({ companionTo: 'feeds-root' })).toBe(true);
      expect(filter.bindings[0].guard({ companionTo: 'other' })).toBe(false);
    });
  });

  describe('subject', () => {
    test('matches any ECHO object via Obj.isObject', ({ expect }) => {
      const filter = AppSurface.subject(AppSurface.Section, Obj.isObject);
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter.bindings[0].guard({ subject: objectA, attendableId: 'id' })).toBe(true);
      expect(filter.bindings[0].guard({ subject: 'string', attendableId: 'id' })).toBe(false);
      expect(filter.bindings[0].guard({ subject: null, attendableId: 'id' })).toBe(false);
    });
  });

  describe('snapshot', () => {
    test('matches snapshot of correct schema', ({ expect }) => {
      const filter = AppSurface.snapshot(AppSurface.Section, TypeA);
      const objectA = Obj.make(TypeA, { name: 'hello' });
      const snap = Obj.getSnapshot(objectA);
      expect(filter.bindings[0].guard({ subject: snap, attendableId: 'id' })).toBe(true);
    });

    test('rejects snapshot of wrong schema', ({ expect }) => {
      const filter = AppSurface.snapshot(AppSurface.Section, TypeA);
      const objectB = Obj.make(TypeB, { value: 1 });
      const snap = Obj.getSnapshot(objectB);
      expect(filter.bindings[0].guard({ subject: snap, attendableId: 'id' })).toBe(false);
    });

    test('rejects live ECHO objects', ({ expect }) => {
      const filter = AppSurface.snapshot(AppSurface.Section, TypeA);
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter.bindings[0].guard({ subject: objectA, attendableId: 'id' })).toBe(false);
    });
  });

  describe('object(ObjectProperties, Schema)', () => {
    test('matches ECHO object subject (no attendableId requirement)', ({ expect }) => {
      const filter = AppSurface.object(AppSurface.ObjectProperties, TypeA);
      const objectA = Obj.make(TypeA, { name: 'hello' });
      expect(filter.bindings[0].role).toBe('object-properties');
      expect(filter.bindings[0].guard({ subject: objectA })).toBe(true);
    });
  });

  describe('Surface.create + SurfaceFilter integration', () => {
    test('derives role and runs guard on matching role', ({ expect }) => {
      const definition = SurfaceInternals.create({
        id: 'test/article',
        filter: AppSurface.object(AppSurface.Article, TypeA),
        component: () => null,
      });
      const objectA = Obj.make(TypeA, { name: 'hi' });
      expect(definition.role).toBe('article');
      expect(definition.filter!({ subject: objectA, attendableId: 'id' }, 'article')).toBe(true);
    });

    test('registers multi-role with role-scoped guards via oneOf', ({ expect }) => {
      const definition = SurfaceInternals.create({
        id: 'test/multi',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, TypeA),
          AppSurface.object(AppSurface.Section, TypeA),
        ),
        component: () => null,
      });
      expect(definition.role).toEqual(['article', 'section']);
      const objectA = Obj.make(TypeA, { name: 'hi' });
      // Article and Section both require attendableId.
      expect(definition.filter!({ subject: objectA, attendableId: 'id' }, 'article')).toBe(true);
      expect(definition.filter!({ subject: objectA }, 'article')).toBe(false);
      expect(definition.filter!({ subject: objectA, attendableId: 'id' }, 'section')).toBe(true);
      expect(definition.filter!({ subject: objectA }, 'section')).toBe(false);
    });
  });
});
