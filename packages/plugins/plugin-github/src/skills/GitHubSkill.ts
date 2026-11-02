//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { GitHubOperation } from '#types';

export const key = 'org.dxos.skill.github';

/**
 * Imported rather than named as strings: an unresolvable tool id is dropped from the toolkit with
 * only a log line. Only verbs that act on the space belong here; live reads and writes against
 * GitHub come from the GitHub connection's MCP server, which the conversation turns on or off.
 */
export const operations: readonly Operation.Definition.Any[] = [
  GitHubOperation.ImportPullRequest,
  GitHubOperation.GenerateWalkthrough,
  GitHubOperation.EnableGitHubFileSync,
];

/** GitHub pull requests and repository files: import pull requests, walk through them, and sync a repository's files. */
export const make = (): Skill.Skill =>
  Skill.make({
    key,
    name: 'GitHub',
    description:
      'Import GitHub pull requests into a space by URL or owner/repo#number, generate walkthroughs, and sync a ' +
      "repository's files (such as .mdl specs) with the space. Use when a task, message or the user names a pull " +
      'request, or asks to sync specs or files from a GitHub repository.',
    agentCanEnable: true,
    mcpPrompt: true,
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        Pull requests live in the space as org.dxos.type.pullRequest objects, fetched from GitHub through the space's GitHub connection.
        Whenever you have a pull request -- one you just opened, or one a task, message or the user names -- import it with ${Operation.toolName(GitHubOperation.ImportPullRequest)}, passing its github.com URL or owner/repo#number.
        Never create the object by hand, since only an import fills its title, state and diff.
        Importing is idempotent: a pull request the space already holds is returned unchanged, so import before referencing one rather than searching first.
        Pass the returned pullRequest reference to the other tools, and use it wherever the pull request must be attached to another object, such as a task's artifacts.
        The import also returns the pull request's repository as a repo reference; add it to a project's repositories, or bind it to the chat, to have coding agents check it out.
        Read a pull request's live state, reviews and CI status with the GitHub MCP server's pull request tools before reporting whether it is open, merged or green; the stored object may be stale.
        Those tools come from the space's GitHub connection; if you cannot see them, the conversation has the connection's MCP server turned off.
        To sync a repository's files with the space (for example its .mdl specs, which become Spec objects), call ${Operation.toolName(GitHubOperation.EnableGitHubFileSync)} with the repository's org.dxos.type.repo object.
        The repository must already be bound by the space's GitHub connection; if it is not, ask the user to add it as a sync target first.
        Enabling is idempotent and only starts the sync: files arrive on the connection's next sync, and Composer edits are committed to the write branch with one pull request, never to the read branch.
      `,
    }),
  });
