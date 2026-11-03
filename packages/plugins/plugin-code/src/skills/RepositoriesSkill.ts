//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { CodeOperation } from '#types';

export const key = 'org.dxos.skill.code.repositories';

/** Operation definitions behind the skill's tools, for hosts without a registry to resolve ToolIds. */
export const operations: readonly Operation.Definition.Any[] = [CodeOperation.UpdateProjectRepositories];

/** Builds the skill, binding the operations above as its tools. */
export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'Project Repositories',
    description:
      "Read and edit the repositories a project's cloud coding agents check out. Use when asked to give a project a " +
      'repository, or to change which repositories its coding agents work on.',
    agentCanEnable: true,
    tools: Skill.toolDefinitions({ operations: [...operations] }),
    instructions: Template.make({
      source: trim`
        A project's repositories are an ordered list of org.dxos.type.repo objects. A cloud coding agent started for the
        project checks every one of them out and works in the first; the repositories bound to its chat follow them.
        Edit the list with Update Project Repositories, passing the project's reference and the repositories to add or
        remove; call it with neither to read the list. A repository added again keeps its place.
        A repository must already be an object in the space. Importing a GitHub pull request returns its repository as
        a repo reference.
      `,
    }),
  });
