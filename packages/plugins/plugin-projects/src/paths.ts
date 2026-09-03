//
// Copyright 2026 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as Project from '@dxos/compute/Project';
import { Type } from '@dxos/echo';

import { CHATS_SEGMENT } from './capabilities/app-graph-builder.ts';

const PROJECT_TYPENAME = Type.getTypename(Project.Project)!;

/** Canonical path to a project's navtree row — the AI group's Projects section. */
export const getProjectPath = (spaceId: string, projectId: string): string =>
  GraphPath.getSpacePath(spaceId, GraphPath.GroupSegments.ai, PROJECT_TYPENAME, projectId);

/**
 * Path to a chat on a project's Chats branch. A project's chats are parented to it, so they are
 * absent from the assistant's own Chats section (which lists only unparented chats) — this branch
 * is the only place the navtree shows them, and the only path that opens them.
 */
export const getProjectChatPath = (spaceId: string, projectId: string, chatId: string): string =>
  `${getProjectPath(spaceId, projectId)}/${CHATS_SEGMENT}/${chatId}`;
