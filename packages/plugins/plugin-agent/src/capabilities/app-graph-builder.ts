//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as TypeSection from '@dxos/app-toolkit/TypeSection';
import * as Agent from '@dxos/assistant/Agent';
import * as Operation from '@dxos/compute/Operation';

import { AgentOperation } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      // plugin-assistant renders Agent articles but lists no Agent section, so agents would otherwise
      // be reachable only through the database subtree.
      TypeSection.createTypeSectionExtension(Agent.Agent, {
        urlKey: 'agent',
        match: AppNodeMatcher.whenNavTreeGroup(GraphPath.GroupTypes.ai),
        groupSegment: GraphPath.GroupSegments.ai,
        createObject: (space) =>
          Operation.invoke(AgentOperation.CreateAgent, { name: '' }, { spaceId: space.db.spaceId }),
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
