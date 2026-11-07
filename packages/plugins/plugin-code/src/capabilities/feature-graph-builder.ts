//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as TypeSection from '@dxos/app-toolkit/TypeSection';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Obj, Type } from '@dxos/echo';
import * as ProjectGraph from '@dxos/plugin-projects/ProjectGraph';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { FEATURE_COMPANION } from '../constants.ts';
import { CodeNamespace } from '../namespace.ts';

/** The companion showing the feature selected on a spec's map, beside the spec, the project and each spec level. */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    /** @deprecated Specs are reached through the project that owns them (its Specs tab), not a section of their own. */
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
    const featureCompanionExtensions = yield* AppGraphBuilder.createTypeExtension({
      id: 'featureCompanion',
      relation: AppNode.companion,
      type: Spec.Spec,
      connector: () => Effect.succeed([makeFeatureCompanion()]),
    });
    // The project's Specs tab shows a spec's map while the project owns one.
    const projectFeatureCompanionExtensions = yield* AppGraphBuilder.createTypeExtension({
      id: 'projectFeatureCompanion',
      relation: AppNode.companion,
      type: Project.Project,
      connector: (project, get) => {
        const specs = get(Obj.atomReactive(get(Obj.atom(project)).specs ?? [])).filter(Spec.instanceOf);
        return Effect.succeed(specs.length > 0 ? [makeFeatureCompanion()] : []);
      },
    });
    const specLevelFeatureCompanionExtensions = yield* AppGraphBuilder.createExtension({
      id: 'specLevelFeatureCompanion',
      relation: AppNode.companion,
      match: (node) =>
        node.type === ProjectGraph.SPEC_LEVEL_TYPE && Spec.instanceOf(node.data)
          ? Option.some(node.data)
          : Option.none(),
      connector: () => Effect.succeed([makeFeatureCompanion()]),
    });
    return Capability.contribute(AppCapabilities.AppGraphBuilder, [
      ...specSectionExtensions,
      ...featureCompanionExtensions,
      ...projectFeatureCompanionExtensions,
      ...specLevelFeatureCompanionExtensions,
    ]);
  }),
);

const makeFeatureCompanion = () =>
  AppNode.makeCompanion({
    variant: FEATURE_COMPANION,
    label: ['feature-companion.label', { ns: CodeNamespace.key }],
    icon: 'ph--puzzle-piece--regular',
    data: FEATURE_COMPANION,
  });
