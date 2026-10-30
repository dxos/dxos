//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Project from '@dxos/compute/Project';
import { type Database, Filter, Migration, Obj, Ref } from '@dxos/echo';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { Feature, LegacyFeature, LegacySpec, Showcase, Spec, SpecText } from '#types';

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
  /** The feature it was a subfeature of, at whichever version it is when read. */
  parent?: LegacyFeature.FeatureV2 | Feature.Feature;
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
  /** Features already rewritten to the current version, by id, so a late child can hang its spec on its parent. */
  migrated: Map<string, Feature.Feature>;
};

const UNPLACED_NAME = 'Features';

/**
 * The nested spec made for a former parent: it is the parent's ECHO child from the moment it is made, so a later run or
 * another peer finds it there rather than making a second one.
 */
const findNested = async (
  db: Database.Database,
  state: SpecsState,
  parent: LegacyFeature.FeatureV2 | Feature.Feature,
): Promise<Spec.Spec | undefined> => {
  const cached = state.byParent.get(parent.id);
  if (cached) {
    return cached;
  }
  const [existing] = await db
    .query(Filter.and(Filter.type(Spec.Spec), Filter.childOf(parent, { transitive: false })))
    .run();
  if (existing) {
    state.byParent.set(parent.id, existing);
  }
  return existing;
};

/** Points a migrated feature at its nested spec, unless it already has one. */
const linkNested = (feature: Feature.Feature, nested: Spec.Spec): void => {
  if (!feature.spec) {
    Obj.update(feature, (feature) => {
      feature.spec = Ref.make(nested);
    });
  }
};

/** The spec a feature moves into: its project's, its former parent's nested one, or the unplaced one. */
const getContainer = async (db: Database.Database, state: SpecsState, placement: Placement): Promise<Spec.Spec> => {
  const { project, parent } = placement;
  if (parent) {
    let spec = await findNested(db, state, parent);
    if (!spec) {
      spec = db.add(Spec.make({ name: parent.name }));
      Obj.setParent(spec, parent);
      state.byParent.set(parent.id, spec);
    }
    // A parent migrated earlier (in this run or a previous one) takes its spec now; one migrated later takes it in its
    // own `onMigration`.
    const migratedParent = state.migrated.get(parent.id) ?? (Feature.instanceOf(parent) ? parent : undefined);
    if (migratedParent) {
      linkNested(migratedParent, spec);
    }
    return spec;
  }

  if (project) {
    let spec = state.byProject.get(project.id);
    if (!spec) {
      // A spec made for this project by an earlier run is reused rather than duplicated.
      const existing = await project.spec?.tryLoad();
      if (Spec.instanceOf(existing)) {
        spec = existing;
      } else {
        const made = db.add(Spec.make({ name: project.name ?? '' }));
        Obj.update(project, (project) => {
          project.spec = Ref.make(made);
        });
        spec = made;
      }
      state.byProject.set(project.id, spec);
    }
    return spec;
  }

  if (state.unplaced) {
    return state.unplaced;
  }
  // Reused across runs: the top-level spec of that name that no project owns.
  const [existing] = await db
    .query(Filter.and(Filter.type(Spec.Spec, { name: UNPLACED_NAME }), Filter.hasParent(false)))
    .run();
  const unplaced = existing ?? db.add(Spec.make({ name: UNPLACED_NAME }));
  state.unplaced = unplaced;
  return unplaced;
};

/**
 * `Feature` 0.2.0 → 0.4.0: features leave projects for specs. Each project's map becomes a spec that names the
 * project, each parent's subfeatures become the features of a spec the parent owns, and canvas positions move from the
 * feature onto its spec's layout. Its `specs` become foreign keys and its spec's document embeds it, as in
 * {@link featureSources}. The specs made so far are held per database in this migration's own closure.
 */
export const makeFeatureSpecs = (): Migration.ObjectMigration => {
  const states = new WeakMap<Database.Database, SpecsState>();
  const getState = (db: Database.Database): SpecsState => {
    let state = states.get(db);
    if (!state) {
      state = { placements: new Map(), byProject: new Map(), byParent: new Map(), migrated: new Map() };
      states.set(db, state);
    }
    return state;
  };

  return Migration.define({
    from: LegacyFeature.FeatureV2,
    to: Feature.Feature,
    transform: async (from, { db }) => {
      const [project, parent] = await Promise.all([from.project?.tryLoad(), from.parent?.tryLoad()]);
      getState(db).placements.set(from.id, {
        project: Obj.instanceOf(Project.Project, project) ? project : undefined,
        parent: Feature.instanceOf(parent) || Obj.instanceOf(LegacyFeature.FeatureV2, parent) ? parent : undefined,
        position: from.position ? { x: from.position.x, y: from.position.y } : undefined,
      });
      const { name, description, requirements, status, code } = from;
      return { name, description, requirements, status, code };
    },
    onMigration: async ({ before, object, db }) => {
      Feature.setSources(object, before.specs ?? []);
      const state = getState(db);
      const placement = state.placements.get(object.id) ?? {};
      state.migrated.set(object.id, object);

      // Its own subfeatures may have migrated first, in this run or an earlier one, and made the nested spec it owns.
      const nested = await findNested(db, state, object);
      if (nested) {
        linkNested(object, nested);
      }

      const container = await getContainer(db, state, placement);
      Obj.update(container, (container) => {
        container.features.push(Ref.make(object));
        if (placement.position) {
          container.layout ??= { positions: {} };
          container.layout.positions[object.id] = placement.position;
        }
      });
      await SpecText.replaceBlock(container, object, Feature.getBlockId(object));
    },
  });
};

/**
 * `Feature` 0.3.0 → 0.4.0: where a feature was read in from moves from `specs` to foreign keys, and its spec's document
 * embeds it, in place of the `feat` block it came from when the document still holds it, else at the end.
 */
export const featureSources = Migration.define({
  from: LegacyFeature.FeatureV3,
  to: Feature.Feature,
  transform: async ({ name, description, requirements, status, spec, code }) => ({
    name,
    description,
    requirements,
    status,
    spec: spec && Ref.fromURI(spec.uri),
    code,
  }),
  onMigration: async ({ before, object }) => {
    Feature.setSources(object, before.specs ?? []);
    const container = Spec.getContainer(object);
    if (container) {
      await SpecText.replaceBlock(container, object, Feature.getBlockId(object));
    }
  },
});

/**
 * `Spec` 0.1.0 → 0.2.0: the project owns its spec (`Project.spec`, which makes it the spec's ECHO parent) where the spec
 * used to name the project. A project that already owns a spec keeps it, and a breakdown keeps the feature that owns
 * it; either way the spec simply stops naming the project. A spec without a document is given one, since 0.2.0 always
 * holds one.
 */
export const makeSpecOwners = (): Migration.ObjectMigration => {
  // The project each spec named, read in the transform while its refs are still live.
  const owners = new Map<string, Project.Project>();
  return Migration.define({
    from: LegacySpec.Spec,
    to: Spec.Spec,
    transform: async ({ id, project, name, description, features, layout, document }, { db }) => {
      const owner = await project?.tryLoad();
      if (Obj.instanceOf(Project.Project, owner)) {
        owners.set(id, owner);
      }
      return { name, description, features, layout, document: document ?? Ref.make(db.add(Spec.makeDocument(name))) };
    },
    onMigration: async ({ before, object }) => {
      // The migrated data is written in place, so a new document is made the spec's child here.
      const document = before.document ? undefined : await object.document.tryLoad();
      if (document) {
        Obj.setParent(document, object);
      }

      const owner = owners.get(object.id);
      owners.delete(object.id);
      if (owner && !owner.spec && !Obj.getParent(object)) {
        Obj.update(owner, (owner) => {
          owner.spec = Ref.make(object);
        });
      }
    },
  });
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(ClientCapabilities.Migration, [
      featureSubfeatures,
      makeFeatureSpecs(),
      makeSpecOwners(),
      // After the specs' own migration, so a feature's container reads as a current spec.
      featureSources,
      Showcase.demonstratesMigration,
    ]);
  }),
);
