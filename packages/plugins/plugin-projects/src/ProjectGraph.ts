//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as Project from '@dxos/compute/Project';
import { Obj, Type } from '@dxos/echo';

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

/** Node `type` of a project's Specs branch, which groups the specs and opens nothing itself. */
export const SPEC_BRANCH_TYPE = 'org.dxos.plugin.projects.spec-branch';

/**
 * Node `type` of a level beneath the Specs branch: one of the project's specs, or an object another plugin nests
 * beneath one. The node's data is the object itself.
 */
export const SPEC_LEVEL_TYPE = 'org.dxos.plugin.projects.spec-level';

/** Path segment (and node id) of the Specs branch under its project. */
export const SPECS_SEGMENT = 'specs';

/** A level node holding `level`; another plugin's levels beneath a spec are made with this too, so they nest alike. */
export const makeLevelNode = (level: Obj.Unknown, space: unknown, { label, icon }: { label: string; icon: string }) =>
  AppGraphNode.make({
    id: level.id,
    type: SPEC_LEVEL_TYPE,
    data: level,
    properties: {
      label,
      icon,
      iconHue: 'amber',
      role: 'branch',
      draggable: false,
      droppable: false,
      space,
      testId: 'projectsPlugin.specLevel',
    },
  });

const PROJECT_TYPENAME = Type.getTypename(Project.Project)!;

/** Canonical path to a project's navtree row — the AI group's Projects section. */
export const getProjectPath = (spaceId: string, projectId: string): string =>
  GraphPath.getSpacePath(spaceId, GraphPath.GroupSegments.ai, PROJECT_TYPENAME, projectId);

/**
 * Path to one level of a project's specs: the Specs branch, a spec, or the last of `lineage`, the levels nested from
 * the top of that spec down.
 */
export const getSpecLevelPath = (
  spaceId: string,
  projectId: string,
  specId?: string,
  lineage: readonly string[] = [],
): string => [getProjectPath(spaceId, projectId), SPECS_SEGMENT, ...(specId ? [specId, ...lineage] : [])].join('/');

/** The project a level lies in: the nearest project among its ECHO ancestors. Stops after a bounded climb. */
export const findLevelProject = (level: Obj.Unknown): Project.Project | undefined => {
  let current: Obj.Unknown | undefined = level;
  for (let depth = 0; current && depth < 64; depth++) {
    if (Obj.instanceOf(Project.Project, current)) {
      return current;
    }
    current = Obj.getParent(current);
  }
  return undefined;
};
