//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import type * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as TypeSection from '@dxos/app-toolkit/TypeSection';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Annotation, Filter, Obj, Type } from '@dxos/echo';
import * as ProjectGraph from '@dxos/plugin-projects/ProjectGraph';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { Feature, FeatureMap } from '#types';

import { FEATURE_COMPANION } from '../constants.ts';
import { CodeNamespace } from '../namespace.ts';
import { refId } from '../operations/feature/util.ts';

/** A project's features in the nav tree, nested beneath its spec levels, and the companion showing the one selected. */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    /**
     * @deprecated Specs are reached through the project that owns them (its Specs tab), not a section of their own.
     * Kept until a follow-up removes it with {@link createSpecBreakdownsExtension}.
     */
    const specSectionExtensions = yield* TypeSection.createTypeSectionExtension(Spec.Spec, {
      urlKey: 'features',
      match: AppNodeMatcher.whenNavTreeGroup(GraphPath.GroupTypes.ai),
      groupSegment: GraphPath.GroupSegments.ai,
      createObject: (space) =>
        Operation.invoke(SpaceOperation.OpenObjectForm, {
          target: space.db,
          typename: Type.getTypename(Spec.Spec),
          targetNodeId: GraphPath.getSpacePath(
            space.db.spaceId,
            GraphPath.GroupSegments.ai,
            Type.getTypename(Spec.Spec),
          ),
        }),
    });
    const specBreakdownExtensions = yield* createSpecBreakdownsExtension();
    const featureLevelExtensions = yield* createFeatureLevelExtension();
    // The feature companion: the feature selected on the spec's map, beside the spec plank.
    const featureCompanionExtensions = yield* AppGraphBuilder.createTypeExtension({
      id: 'featureCompanion',
      relation: AppNode.companion,
      type: Spec.Spec,
      connector: () => Effect.succeed([makeFeatureCompanion()]),
    });
    // The same companion beside a project, while it owns a spec: the project's Specs tab shows a spec's map.
    const projectFeatureCompanionExtensions = yield* AppGraphBuilder.createTypeExtension({
      id: 'projectFeatureCompanion',
      relation: AppNode.companion,
      type: Project.Project,
      connector: (project, get) => {
        const specs = get(Obj.atomReactive(get(Obj.atom(project)).specs ?? [])).filter(Spec.instanceOf);
        return Effect.succeed(specs.length > 0 ? [makeFeatureCompanion()] : []);
      },
    });
    return Capability.contribute(AppCapabilities.AppGraphBuilder, [
      ...specSectionExtensions,
      ...specBreakdownExtensions,
      ...featureLevelExtensions,
      ...featureCompanionExtensions,
      ...projectFeatureCompanionExtensions,
    ]);
  }),
);

/**
 * One URL binding for a spec and the specs nested beneath it, shared with the Specs type section, so
 * `features/<id>+<nested>+<nested>` reconstructs the chain the way the project's binding does for a project.
 */
const SPEC_URL: AppGraphBuilder.UrlBinding = {
  key: 'features',
  kind: 'item',
  path: [GraphPath.GroupSegments.ai, Type.getTypename(Spec.Spec)],
};

/**
 * The specs that break down a spec's features, as its children in the navtree, in the order of the features they
 * break down. Each child is itself a spec, so this extension matches it too and the tree nests to any depth.
 *
 * @deprecated Serves the top-level Specs section, which is going away; a project's Specs tab zooms into breakdowns.
 */
export const createSpecBreakdownsExtension = () =>
  AppGraphBuilder.createExtension({
    id: 'specBreakdowns',
    url: SPEC_URL,
    match: (node) => (Spec.instanceOf(node.data) ? Option.some(node.data) : Option.none()),
    connector: (spec, get) => {
      const db = Obj.getDatabase(spec);
      if (!db) {
        return Effect.succeed([]);
      }

      const order = Option.getOrElse(get(Annotation.atom(spec, FeatureMap.FeaturesAnnotation)), () => []).map(refId);
      const nested = get(db.query(Filter.type(Spec.Spec)).atom)
        .map((child) => ({ child, owner: FeatureMap.getOwner(child) }))
        .flatMap(({ child, owner }) =>
          owner && FeatureMap.getContainer(owner)?.id === spec.id
            ? [{ child, index: order.findIndex((id) => id === owner.id) }]
            : [],
        )
        .sort((left, right) => left.index - right.index);
      return Effect.succeed(
        nested
          .map(({ child }) => AppNode.makeObject({ get, db, object: child, navigable: true }))
          .filter((node): node is NonNullable<typeof node> => node !== null),
      );
    },
  });

/** A level of a project's specs that has a map: one of its specs, or a feature beneath one. */
type Level = Spec.Spec | Feature.Feature;

const matchSpecLevel = (node: AppGraphNode.Node): Option.Option<{ level: Level; space: unknown }> =>
  node.type === ProjectGraph.SPEC_LEVEL_TYPE && (Spec.instanceOf(node.data) || Feature.instanceOf(node.data))
    ? Option.some({ level: node.data, space: node.properties.space })
    : Option.none();

/** The spec a level maps: the spec itself, or the one breaking the feature down. */
const getLevelSpec = (level: Level, get: Atom.AtomContext): Spec.Spec | undefined => {
  if (Spec.instanceOf(level)) {
    return level;
  }
  const specRef = get(Obj.atom(level)).spec;
  const spec = specRef && get(Obj.atomReactive(specRef));
  return Spec.instanceOf(spec) ? spec : undefined;
};

/** The features on `spec`'s map as level nodes, in the map's order: by name. */
const makeFeatureNodes = (spec: Spec.Spec | undefined, space: unknown, get: Atom.AtomContext) => {
  if (!spec) {
    return [];
  }
  const refs = Option.getOrElse(get(Annotation.atom(spec, FeatureMap.FeaturesAnnotation)), () => []);
  return get(Obj.atomReactive(refs))
    .filter(Feature.instanceOf)
    .map((feature) => ({ feature, name: get(Obj.atom(feature)).name }))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map(({ feature, name }) =>
      ProjectGraph.makeLevelNode(feature, space, { label: name, icon: 'ph--puzzle-piece--regular' }),
    );
};

/**
 * Each spec level's features nested beneath it to any depth, as level nodes under the project's binding, so
 * `…/project/<id>/specs/<spec>/<feature>/…` addresses one depth of the project.
 */
export const createFeatureLevelExtension = () =>
  Effect.all([
    AppGraphBuilder.createExtension({
      id: 'projectSpecLevels',
      url: ProjectGraph.PROJECT_URL,
      match: matchSpecLevel,
      connector: ({ level, space }, get) => Effect.succeed(makeFeatureNodes(getLevelSpec(level, get), space, get)),
    }),
    // The feature companion beside every level that has a map to select from.
    AppGraphBuilder.createExtension({
      id: 'specLevelFeatureCompanion',
      relation: AppNode.companion,
      match: matchSpecLevel,
      connector: ({ level }, get) => Effect.succeed(getLevelSpec(level, get) ? [makeFeatureCompanion()] : []),
    }),
  ]).pipe(Effect.map((extensions) => extensions.flat()));

const makeFeatureCompanion = () =>
  AppNode.makeCompanion({
    variant: FEATURE_COMPANION,
    label: ['feature-companion.label', { ns: CodeNamespace.key }],
    icon: 'ph--puzzle-piece--regular',
    data: FEATURE_COMPANION,
  });
