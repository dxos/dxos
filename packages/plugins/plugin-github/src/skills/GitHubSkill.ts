//
// Copyright 2026 DXOS.org
//

import type * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { GitHubOperation } from '#types';

export const key = 'org.dxos.skill.github';

/**
 * Imported rather than named as strings: an unresolvable tool id is dropped from the toolkit with
 * only a log line. Verbs that write to GitHub (approvals, comments) are left out so an agent cannot
 * post under the user's account without a skill that asks for it.
 */
export const operations: readonly Operation.Definition.Any[] = [
  GitHubOperation.ImportPullRequest,
  GitHubOperation.GetPullRequestStatus,
  GitHubOperation.GenerateWalkthrough,
];

/** GitHub pull requests: import them into a space by URL, read their live state, and walk through them. */
export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'GitHub',
    description:
      'Import GitHub pull requests into a space by URL or owner/repo#number, read their state and CI ' +
      'status, and generate walkthroughs. Use when a task, message or the user names a pull request.',
    agentCanEnable: true,
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        Pull requests live in the space as org.dxos.type.pullRequest objects, fetched from GitHub through the space's GitHub connection.
        To get one, import it by its github.com URL or as owner/repo#number; never create the object by hand, since only an import fills its title, state and diff.
        Importing is idempotent: a pull request the space already holds is returned unchanged, so import before referencing one rather than searching first.
        Pass the returned pullRequest reference to the other tools, and use it wherever the pull request must be attached to another object.
        Read the state and CI status of a pull request before reporting whether it is open, merged or green; the stored object may be stale.
      `,
    }),
  });
