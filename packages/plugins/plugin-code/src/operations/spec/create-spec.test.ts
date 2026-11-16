//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';

import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Database, Obj, Ref } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';

import { CodeOperation, FeatureMap } from '#types';

import createSpec from './create-spec.ts';

const testLayer = () => TestDatabaseLayer({ types: CodeOperation.SPEC_ITEM_TYPES });

const SYNC = ['```mdl', 'feat k1: Sync', '  status: planned', '```', ''].join('\n');

describe('CodeOperation.CreateSpec', () => {
  it.effect("a breakdown joins the parent's project and the feature cites it; asking again returns it", () =>
    Effect.gen(function* () {
      const project = yield* Database.add(Project.make({ name: 'Mail' }));
      const parent = yield* Database.add(
        Spec.make({ name: 'Mail', dialects: [FeatureMap.SOFTWARE_DIALECT], content: SYNC }),
      );
      Obj.update(project, (project) => {
        project.specs.push(Ref.make(parent));
      });
      const breaks = { spec: Ref.make(parent), item: 'k1' };

      const { spec } = yield* createSpec.handler({ name: 'Sync', breaks });
      expect(Project.getOwner(spec)?.id).toBe(project.id);
      expect(spec.dialects).toEqual([FeatureMap.SOFTWARE_DIALECT]);
      const text = yield* Database.load(parent.content);
      expect(text.content).toContain(`spec: echo:///${spec.id}`);

      const again = yield* createSpec.handler({ name: 'Other', breaks });
      expect(again.spec.id).toBe(spec.id);
    }).pipe(Effect.provide(testLayer())),
  );
});
