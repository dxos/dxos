//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import type * as Project from '@dxos/compute/Project';
import { Database, EID, Obj, Ref, Relation } from '@dxos/echo';

import { type Feature, FeatureOperation, Spec } from '#types';

/** Entity id of a ref or a relation endpoint; space-qualified and local URIs may name the same object. */
export const entityId = (uri: string): string => {
  const eid = EID.tryParse(uri);
  return (eid && EID.getEntityId(eid)) ?? uri;
};

export const refId = (ref: Ref.Ref<unknown>): string => entityId(ref.uri);

/** `[source, target]` entity ids of a relation. */
export const endpoints = (relation: Relation.Unknown): readonly [string, string] => [
  entityId(Relation.getSourceURI(relation)),
  entityId(Relation.getTargetURI(relation)),
];

/** Fails when a spec other than `spec` already names the project: a project has at most one spec. */
export const ensureProjectFree = Effect.fn(function* (project: Ref.Ref<Project.Project> | undefined, spec?: Spec.Spec) {
  if (!project) {
    return;
  }
  const target = yield* Database.load(project);
  const existing = (yield* Database.query(Spec.projectFilter(target)).run).find((other) => other.id !== spec?.id);
  if (existing) {
    return yield* Effect.fail(
      new FeatureOperation.ProjectHasSpecError({
        message: `Project "${target.name ?? target.id}" already has a spec: "${existing.name}" (${existing.id}).`,
      }),
    );
  }
});

/** Adds a top-level spec, refused when its project already has one. */
export const addSpec = Effect.fn(function* (props: Spec.MakeProps) {
  yield* ensureProjectFree(props.project);
  return yield* Database.add(Spec.make(props));
});

/** The spec that breaks the feature down, made (named after it) when it has none. */
export const ensureBreakdown = Effect.fn(function* (feature: Feature.Feature) {
  const existing = feature.spec && (yield* Database.load(feature.spec));
  if (existing) {
    return existing;
  }
  const spec = yield* Database.add(Spec.make({ name: feature.name }));
  Obj.update(feature, (feature) => {
    feature.spec = Ref.make(spec);
  });
  return spec;
});

/** Takes the feature off its spec's map and canvas, leaving the feature itself. */
export const detach = (feature: Feature.Feature): void => {
  const container = Spec.getContainer(feature);
  if (!container) {
    return;
  }
  Obj.update(container, (container) => {
    const index = container.features.findIndex((ref) => refId(ref) === feature.id);
    if (index !== -1) {
      container.features.splice(index, 1);
    }
    if (container.layout?.positions[feature.id]) {
      delete container.layout.positions[feature.id];
    }
  });
};

/** Lists the feature on the spec's map, which makes the spec its ECHO parent. */
export const attach = (spec: Spec.Spec, feature: Feature.Feature): void => {
  Obj.update(spec, (spec) => {
    spec.features.push(Ref.make(feature));
  });
};
