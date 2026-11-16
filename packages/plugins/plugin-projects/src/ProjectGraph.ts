//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as Project from '@dxos/compute/Project';
import { Type } from '@dxos/echo';

/**
 * One URL binding for everything a project contains, shared with the type section that addresses the
 * project itself — so `project/<id>` is the project, `project/<id>+sessions` its Sessions branch, and
 * `project/<id>+sessions+<session>` a session. The path is fixed only as far as the Project section;
 * what varies below it rides in the pair's id, `+`-joined, and the chain reconstructs with no lookup.
 * Every extension under the key must share this one path, or a node's address forks by connector.
 */
export const PROJECT_URL: AppGraphBuilder.UrlBinding = {
  key: 'project',
  kind: 'item',
  path: [GraphPath.GroupSegments.ai, Type.getTypename(Project.Project)],
};

const PROJECT_TYPENAME = Type.getTypename(Project.Project)!;

/** Canonical path to a project's navtree row — the AI group's Projects section. */
export const getProjectPath = (spaceId: string, projectId: string): string =>
  GraphPath.getSpacePath(spaceId, GraphPath.GroupSegments.ai, PROJECT_TYPENAME, projectId);
