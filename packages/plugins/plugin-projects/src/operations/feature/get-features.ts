//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Query } from '@dxos/echo';
import { Task } from '@dxos/types';

import { Feature, FeatureOperation, Showcase } from '#types';

import { endpoints, refId } from './util.ts';

const handler: Operation.WithHandler<typeof FeatureOperation.GetFeatures> = FeatureOperation.GetFeatures.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ project: projectRef }) {
      const projectId = refId(projectRef);
      const all = (yield* Database.query(Filter.type(Feature.Feature)).run).sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      // The project's top-level features, each followed by its subtree, depth first.
      const children = Map.groupBy(
        all.filter((feature) => feature.parent),
        (feature) => (feature.parent ? refId(feature.parent) : ''),
      );
      const members: Feature.Feature[] = [];
      const visit = (feature: Feature.Feature) => {
        if (!members.includes(feature)) {
          members.push(feature);
          (children.get(feature.id) ?? []).forEach(visit);
        }
      };
      all.filter((feature) => feature.project && refId(feature.project) === projectId).forEach(visit);
      const features: FeatureOperation.FeatureSummary[] = [];
      for (const feature of members) {
        const selected = Query.select(Filter.id(feature.id));
        const dependsOn = yield* Database.query(selected.sourceOf(Feature.DependsOn)).run;
        const tasks = yield* Database.query(selected.targetOf(Feature.Implements).source()).run;
        const showcases = yield* Database.query(selected.targetOf(Showcase.Demonstrates).source()).run;
        features.push({
          id: feature.id,
          link: Feature.getLink(feature),
          name: feature.name,
          description: feature.description,
          status: feature.status,
          requirements: (feature.requirements ?? []).map((requirement) => ({ ...requirement })),
          specs: [...(feature.specs ?? [])],
          parent: feature.parent && refId(feature.parent),
          dependsOn: dependsOn.map((relation) => endpoints(relation)[1]),
          tasks: tasks
            .filter((task): task is Task.Task => Obj.instanceOf(Task.Task, task))
            .map(({ id, title, status }) => ({ id, title, status })),
          showcases: showcases.map(({ id, name }) => ({ id, name })),
        });
      }
      return { features };
    }),
  ),
);

export default handler;
