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

/** The spec the project owns, if any; a ref to a deleted or foreign object reads as none. */
export const loadProjectSpec = Effect.fn(function* (project: Project.Project) {
  const owned = yield* Effect.promise(async () => project.spec?.tryLoad());
  return Spec.instanceOf(owned) ? owned : undefined;
});

/** Fails when the project owns a spec other than `spec`: a project has at most one. */
export const ensureProjectFree = Effect.fn(function* (project: Project.Project, spec?: Spec.Spec) {
  const existing = yield* loadProjectSpec(project);
  if (existing && existing.id !== spec?.id) {
    return yield* Effect.fail(
      new FeatureOperation.ProjectHasSpecError({
        message: `Project "${project.name ?? project.id}" already has a spec: "${existing.name}" (${existing.id}).`,
      }),
    );
  }
});

/**
 * Makes the project own the spec, which makes it the spec's ECHO parent. Refused when the project owns another spec,
 * or when a feature owns this one: a breakdown's work is tracked in the project above it.
 */
export const setProject = Effect.fn(function* (spec: Spec.Spec, projectRef: Ref.Ref<Project.Project>) {
  const project = yield* Database.load(projectRef);
  if (Spec.getOwner(spec)) {
    return yield* Effect.fail(
      new FeatureOperation.BreakdownSpecError({
        message: `"${spec.name}" breaks down a feature, so its work is tracked in the project above it.`,
      }),
    );
  }
  yield* ensureProjectFree(project, spec);
  clearProject(spec);
  Obj.update(project, (project) => {
    project.spec = Ref.make(spec);
  });
});

/** Releases the spec from the project that owns it, leaving the spec top-level. */
export const clearProject = (spec: Spec.Spec): void => {
  const project = Spec.getProject(spec);
  if (project) {
    Obj.update(project, (project) => {
      delete project.spec;
    });
    Obj.setParent(spec, undefined);
  }
};

/** Adds a top-level spec, owned by the project when one is given. */
export const addSpec = Effect.fn(function* ({
  project,
  ...props
}: Spec.MakeProps & { project?: Ref.Ref<Project.Project> }) {
  if (project) {
    yield* ensureProjectFree(yield* Database.load(project));
  }
  const spec = yield* Database.add(Spec.make(props));
  if (project) {
    yield* setProject(spec, project);
  }
  return spec;
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
