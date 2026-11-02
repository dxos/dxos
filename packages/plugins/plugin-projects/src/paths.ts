//
// Copyright 2026 DXOS.org
//

import { ARTIFACTS_SEGMENT, SESSIONS_SEGMENT } from './capabilities/app-graph-builder.ts';
import * as ProjectGraph from './ProjectGraph.ts';

/**
 * Path to a chat on a project's Chats branch. A project's chats are parented to it, so they are
 * absent from the assistant's own Chats section (which lists only unparented chats) — this branch
 * is the only place the navtree shows them, and the only path that opens them.
 */
export const getProjectChatPath = (spaceId: string, projectId: string, chatId: string): string =>
  `${ProjectGraph.getProjectPath(spaceId, projectId)}/${SESSIONS_SEGMENT}/${chatId}`;

/** Path to an artifact on a project's Artifacts branch. */
export const getProjectArtifactPath = (spaceId: string, projectId: string, artifactId: string): string =>
  `${ProjectGraph.getProjectPath(spaceId, projectId)}/${ARTIFACTS_SEGMENT}/${artifactId}`;
