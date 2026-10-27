//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Project from '@dxos/compute/Project';
import { type Database, Filter, Migration, Obj, Ref } from '@dxos/echo';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { Feature, LegacyFeature, Spec } from '#types';

/**
 * `Feature` 0.1.0 → 0.2.0: `in-progress` leaves the status (work is read from linked tasks), and each subfeature record
 * becomes a feature whose `parent` is the migrated one, so it can carry a description and requirements of its own.
 */
export const featureSubfeatures = Migration.define({
  from: LegacyFeature.Feature,
  to: LegacyFeature.FeatureV2,
  transform: async ({ name, description, status, specs, project, code, position }) => ({
    name,
    description,
    status: LegacyFeature.toStatus(status),
    requirements: [],
    specs,
    project,
    code,
    position,
  }),
  // The children need a ref to the migrated object, which only exists once the transform has run.
  onMigration: async ({ before, object, db }) => {
    for (const subfeature of before.subfeatures ?? []) {
      db.add(
        Obj.make(LegacyFeature.FeatureV2, {
          name: subfeature.name,
          status: LegacyFeature.toStatus(subfeature.status),
          requirements: [],
          parent: Ref.make(object),
        }),
      );
    }
  },
});

/** Where a 0.2.0 feature sat, read in the transform while its refs are still live. */
type Placement = {
  project?: Project.Project;
  /** The feature it was a subfeature of. */
  parent?: { id: string; name: string };
  position?: Spec.Position;
};

/**
 * Per database: the specs made so far, so the features of one project (or one parent) land in one spec whichever
 * order they migrate in.
 */
type SpecsState = {
  placements: Map<string, Placement>;
  /** The spec made for each project's map, by project id. */
  byProject: Map<string, Spec.Spec>;
  /** The nested spec made for each former parent feature, by that feature's id. */
  byParent: Map<string, Spec.Spec>;
  /** The spec collecting features that sat on no map. */
  unplaced?: Spec.Spec;
  /** Features already rewritten to 0.3.0, by id, so a late child can hang its spec on its parent. */
  migrated: Map<string, Feature.Feature>;
};

const states = new WeakMap<Database.Database, SpecsState>();

const getState = (db: Database.Database): SpecsState => {
  let state = states.get(db);
  if (!state) {
    state = { placements: new Map(), byProject: new Map(), byParent: new Map(), migrated: new Map() };
    states.set(db, state);
  }
  return state;
};

/** The spec a feature moves into: its project's, its former parent's nested one, or the unplaced one. */
const getContainer = async (db: Database.Database, state: SpecsState, placement: Placement): Promise<Spec.Spec> => {
  const { project, parent } = placement;
  if (parent) {
    let spec = state.byParent.get(parent.id);
    if (!spec) {
      spec = db.add(Spec.make({ name: parent.name }));
      state.byParent.set(parent.id, spec);
      // A parent migrated earlier takes its spec now; one migrated later takes it in its own `onMigration`.
      const migratedParent = state.migrated.get(parent.id);
      if (migratedParent) {
        const nested = spec;
        Obj.update(migratedParent, (migratedParent) => {
          migratedParent.spec = Ref.make(nested);
        });
      }
    }
    return spec;
  }

  if (project) {
    let spec = state.byProject.get(project.id);
    if (!spec) {
      // A spec made for this project by an earlier run is reused rather than duplicated.
      const [existing] = await db.query(Filter.type(Spec.Spec, { project: Ref.make(project) })).run();
      spec = existing ?? db.add(Spec.make({ name: project.name ?? '', project: Ref.make(project) }));
      state.byProject.set(project.id, spec);
    }
    return spec;
  }

  state.unplaced ??= db.add(Spec.make({ name: 'Features' }));
  return state.unplaced;
};

/**
 * `Feature` 0.2.0 → 0.3.0: features leave projects for specs. Each project's map becomes a spec that names the
 * project, each parent's subfeatures become the features of a spec the parent owns, and canvas positions move from the
 * feature onto its spec's layout.
 */
export const featureSpecs = Migration.define({
  from: LegacyFeature.FeatureV2,
  to: Feature.Feature,
  transform: async (from, { db }) => {
    const [project, parent] = await Promise.all([from.project?.tryLoad(), from.parent?.tryLoad()]);
    getState(db).placements.set(from.id, {
      project: Obj.instanceOf(Project.Project, project) ? project : undefined,
      parent: parent ? { id: parent.id, name: parent.name } : undefined,
      position: from.position ? { x: from.position.x, y: from.position.y } : undefined,
    });
    const { name, description, requirements, status, specs, code } = from;
    return { name, description, requirements, status, specs, code };
  },
  onMigration: async ({ object, db }) => {
    const state = getState(db);
    const placement = state.placements.get(object.id) ?? {};
    state.migrated.set(object.id, object);

    // Its own subfeatures may have migrated first and made the nested spec it now owns.
    const nested = state.byParent.get(object.id);
    if (nested) {
      Obj.update(object, (object) => {
        object.spec = Ref.make(nested);
      });
    }

    const container = await getContainer(db, state, placement);
    Obj.update(container, (container) => {
      container.features.push(Ref.make(object));
      if (placement.position) {
        container.layout ??= { positions: {} };
        container.layout.positions[object.id] = placement.position;
      }
    });
  },
});

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(ClientCapabilities.Migration, [featureSubfeatures, featureSpecs]);
  }),
);
