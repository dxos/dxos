//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Spec from '@dxos/compute/Spec';
import { Database, Obj, Ref, Relation, Text } from '@dxos/echo';
import * as FeatureMap from '@dxos/plugin-code/FeatureMap';
import * as SpecItem from '@dxos/plugin-code/SpecItem';

import { type ProjectResult } from './project.ts';
import { type SpecResult } from './spec.ts';
import { type TasksResult } from './tasks.ts';

//
// The feature map: one card per card on the page, all `planned`. The verdict comes first and the rest depend on it,
// since they share its forecast. The build task implements all four, so each card shows the task that ships it.
//

export type FeatureSeed = {
  readonly name: string;
  /** The block that states it, whose prose and requirements the spec's text holds. */
  readonly feat: string;
  /** Its parts, each a feature on the spec that breaks this one down. */
  readonly subfeatures?: readonly string[];
};

export const FEATURES: readonly FeatureSeed[] = [
  {
    name: 'Go / no-go',
    feat: 'F-1',
    subfeatures: ['Rain rule', 'Wind rule'],
  },
  {
    name: 'Hourly forecast',
    feat: 'F-2',
  },
  {
    name: 'Best window',
    feat: 'F-3',
  },
  {
    name: 'Daylight',
    feat: 'F-4',
  },
];

export type FeaturesInput = { tasks: TasksResult; project: ProjectResult; spec: SpecResult };

export type FeaturesResult = { map: Spec.Spec; breakdown: Spec.Spec };

export const FeaturesPartial: SampleSpace.Partial<FeaturesResult, FeaturesInput> = SampleSpace.partial('features', {
  schemas: [Spec.Spec, SpecItem.Implements],
  run: ({ tasks, project, spec }: FeaturesInput) =>
    Effect.gen(function* () {
      // The imported spec is the map, which the project that tracks its tasks owns; its feat blocks are the cards.
      const map = spec.spec;
      const [verdict, ...rest] = FEATURES;
      const parts = verdict.subfeatures ?? [];
      const breakdown = yield* Database.add(
        Spec.make({
          name: verdict.name,
          dialects: [...FeatureMap.SOFTWARE_DIALECTS],
          content: SpecItem.writeFeatures(
            '',
            parts.map((name, index) => ({ key: `F-${index + 1}`, title: name, fields: { status: 'planned' } })),
          ),
        }),
      );
      // Made by this template, so a text that will not load is a bug, not an outcome.
      const text = yield* Database.load(map.content).pipe(Effect.orDie);
      const content = SpecItem.writeFeatures(
        text.content,
        FEATURES.map((seed) => ({
          key: seed.feat,
          title: seed.name,
          fields: {
            status: 'planned',
            // Every other card reads the verdict's forecast.
            ...(seed !== verdict && { needs: [verdict.feat] }),
            ...(seed === verdict && { spec: `echo:///${breakdown.id}` }),
          },
        })),
      );
      Obj.update(text, (text) => {
        Text.update(text, 'content', content);
      });
      Obj.update(map, (map) => {
        map.dialects.splice(0, map.dialects.length, ...FeatureMap.SOFTWARE_DIALECTS);
      });
      Obj.update(project.project, (project) => {
        project.specs.push(Ref.make(map), Ref.make(breakdown));
      });

      // The build task ships every card, so each card shows it.
      const build = tasks.tasks[1];
      for (const seed of [verdict, ...rest]) {
        yield* Database.add(
          SpecItem.makeImplements({ [Relation.Source]: build, [Relation.Target]: map, item: seed.feat }),
        );
      }

      return { map, breakdown };
    }),
});
