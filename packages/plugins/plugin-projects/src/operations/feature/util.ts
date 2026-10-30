//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Database, EID, Obj, Ref, Relation } from '@dxos/echo';

import { type Feature, FeatureMap, FeatureOperation } from '#types';

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

/** The specs the project owns, in order; refs to deleted or foreign objects are skipped. */
export const loadProjectSpecs = Effect.fn(function* (project: Project.Project) {
  const owned = yield* Effect.promise(async () => Ref.loadAll(project.specs ?? []));
  return owned.filter(Spec.instanceOf);
});

/**
 * Makes the project own the spec, which makes it the spec's ECHO parent. Refused when a feature owns the spec: a
 * breakdown's work is tracked in the project above it.
 */
export const setProject = Effect.fn(function* (spec: Spec.Spec, projectRef: Ref.Ref<Project.Project>) {
  const project = yield* Database.load(projectRef);
  if (FeatureMap.getOwner(spec)) {
    return yield* Effect.fail(
      new FeatureOperation.BreakdownSpecError({
        message: `"${spec.name}" breaks down a feature, so its work is tracked in the project above it.`,
      }),
    );
  }
  if (Project.getOwner(spec)?.id === project.id) {
    return;
  }
  clearProject(spec);
  Obj.update(project, (project) => {
    project.specs.push(Ref.make(spec));
  });
});

/** Releases the spec from the project that owns it, leaving the spec top-level. */
export const clearProject = (spec: Spec.Spec): void => {
  const project = Project.getOwner(spec);
  if (project) {
    const index = project.specs.findIndex((ref) => refId(ref) === spec.id);
    if (index !== -1) {
      Obj.update(project, (project) => {
        project.specs.splice(index, 1);
      });
    }
    Obj.setParent(spec, undefined);
  }
};

/** Adds a top-level spec, owned by the project when one is given. */
export const addSpec = Effect.fn(function* ({
  project,
  ...props
}: Spec.MakeProps & { project?: Ref.Ref<Project.Project> }) {
  const spec = yield* Database.add(Spec.make(props));
  if (project) {
    yield* setProject(spec, project);
  }
  return spec;
});

/** The spec that breaks the feature down, made (named after it, in its spec's dialects) when it has none. */
export const ensureBreakdown = Effect.fn(function* (feature: Feature.Feature) {
  const existing = feature.spec && (yield* Database.load(feature.spec));
  if (existing) {
    return existing;
  }
  const dialects = [...(FeatureMap.getContainer(feature)?.dialects ?? [])];
  const spec = yield* Database.add(Spec.make({ name: feature.name, dialects }));
  Obj.update(feature, (feature) => {
    feature.spec = Ref.make(spec);
  });
  return spec;
});

/** Takes the feature off its spec's map and canvas, leaving the feature itself. */
export const detach = (feature: Feature.Feature): void => {
  const container = FeatureMap.getContainer(feature);
  if (container) {
    FeatureMap.detach(container, feature.id);
  }
};

/** Lists the feature on the spec's map, which makes the spec its ECHO parent. */
export const attach = (spec: Spec.Spec, feature: Feature.Feature): void => FeatureMap.attach(spec, feature);
