//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as GraphNode from '@dxos/graph/GraphNode';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceEvents from '@dxos/plugin-space/SpaceEvents';

// Raw import keeps the welcome copy in a standalone Markdown file that renders in editors and diffs cleanly.
import README_CONTENT from '../content/README.md?raw';
import { OnboardingOperation } from '../operations';
import { type OnboardingOptions } from './capabilities';

const DEFAULT_SPACE_ICON = 'house-line';
const DEFAULT_SPACE_ICON_HUE = 'violet';

export const README_DOCUMENT_NAME = 'README';

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ generateSampleSpace }: OnboardingOptions) {
    const { Annotation, Obj, Ref } = yield* Effect.tryPromise(() => import('@dxos/echo'));
    const { ClientCapabilities } = yield* Effect.tryPromise(() => import('@dxos/plugin-client'));
    const { Markdown } = yield* Effect.tryPromise(() => import('@dxos/plugin-markdown'));
    const {
      AppAnnotation: { RootCollectionAnnotation },
    } = yield* Effect.tryPromise(() => import('@dxos/app-toolkit'));

    const operationInvoker = yield* Capabilities.OperationInvoker;
    const { graph } = yield* AppCapabilities.AppGraph;
    const client = yield* ClientCapabilities.Client;
    const defaultSpace = yield* SpaceCapabilities.DefaultSpace;

    Obj.update(defaultSpace.properties, (obj) => {
      obj.icon = DEFAULT_SPACE_ICON;
      obj.hue = DEFAULT_SPACE_ICON_HUE;
    });

    // Run plugin OnCreateSpace callbacks against the default space so capabilities that
    // depend on a fresh space (e.g. skills) wire themselves up. The sample space
    // gets the same callbacks via the regular SpaceCreated event on import.
    yield* Plugin.activate(SpaceEvents.SpaceCreated);
    const rootCollection = Option.getOrUndefined(
      Annotation.get(defaultSpace.properties, RootCollectionAnnotation),
    )?.target;
    if (rootCollection) {
      const onCreateSpaceCallbacks = yield* Capability.getAll(SpaceCapabilities.OnCreateSpace);
      yield* Effect.all(
        onCreateSpaceCallbacks.map((onCreateSpace) =>
          onCreateSpace({ space: defaultSpace, isDefault: true, rootCollection: rootCollection }),
        ),
      ).pipe(Effect.provideService(Operation.Service, operationInvoker));

      const welcomeDoc = Markdown.make({ name: README_DOCUMENT_NAME, content: README_CONTENT });
      defaultSpace.db.add(welcomeDoc);
      Obj.update(rootCollection, (rootCollection) => {
        rootCollection.objects.push(Ref.make(welcomeDoc));
      });
    }

    if (generateSampleSpace) {
      yield* Effect.promise(() => operationInvoker.invokePromise(OnboardingOperation.ImportSampleSpace, {}));

      // Eagerly expand the graph so the sample space's content is visible in the navtree
      // as soon as the user opens it, without waiting for a lazy expansion pass.
      const sampleSpace = client.spaces.get().find((space) => space.tags.includes(AppSpace.SAMPLE_SPACE_TAG));
      AppGraph.expandSync(graph, GraphNode.RootId, 'child');
      AppGraph.expandSync(graph, defaultSpace.id, 'child');
      if (sampleSpace) {
        AppGraph.expandSync(graph, sampleSpace.id, 'child');
      }
    } else {
      AppGraph.expandSync(graph, GraphNode.RootId, 'child');
      AppGraph.expandSync(graph, defaultSpace.id, 'child');
    }

    const homePath = GraphPath.getSpaceHomePath(defaultSpace.id);
    yield* Effect.gen(function* () {
      // Claim the workspace before setting the plank: `plugin-space` switches to the default space
      // from a forked fiber, and a switch restores the target workspace's (empty) persisted deck, so
      // a plank set first is wiped. Switching here also satisfies that fiber's `workspace === default`
      // guard, leaving it a no-op.
      yield* Operation.invoke(LayoutOperation.SwitchWorkspace, {
        subject: GraphPath.getSpacePath(defaultSpace.id),
      });
      // Land on the default space's Home, which surfaces the seeded README among its recent objects.
      yield* Operation.invoke(LayoutOperation.Set, { subject: [homePath] });
      // Expose is scheduled because the navtree may not have rendered yet at this point.
      yield* Operation.schedule(LayoutOperation.Expose, { subject: homePath });
    }).pipe(Effect.provideService(Operation.Service, operationInvoker));

    return [];
  }),
);
