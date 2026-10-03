//
// Copyright 2026 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as Agent from '@dxos/assistant/Agent';

const { getSectionPath: getAgentsPath, getObjectPath: getAgentPath } = GraphPath.createTypeSectionPaths(Agent.Agent, {
  groupId: GraphPath.GroupSegments.ai,
});

export { getAgentPath, getAgentsPath };

/** Companion variant of an Agent's activity panel; the graph node and its surface both key on it. */
export const AGENT_ACTIVITY_VARIANT = 'activity';
