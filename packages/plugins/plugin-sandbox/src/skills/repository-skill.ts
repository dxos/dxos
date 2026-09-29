//
// Copyright 2026 DXOS.org
//

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { Repository, RepositoryOperation } from '#types';

const make = () =>
  Skill.make({
    key: Repository.SKILL_KEY,
    name: 'Repository',
    agentCanEnable: true,
    tools: Skill.toolDefinitions({
      operations: [
        RepositoryOperation.CreateRepository,
        RepositoryOperation.Push,
        RepositoryOperation.Pull,
        RepositoryOperation.GetBranches,
        RepositoryOperation.GetLog,
        RepositoryOperation.GetTree,
        RepositoryOperation.ReadFile,
      ],
    }),
    instructions: Template.make({
      source: trim`
        You can create git repositories and move work between them and sandboxes.
        Sandboxes are ephemeral: their files go when the sandbox expires. A repository is durable, so when
        you build something in a sandbox that should be kept, push it to a repository.
        - Push commits everything under a sandbox directory (default /workspace) and pushes it to a branch.
          It initializes git in the directory if needed and ignores node_modules. A push that is rejected
          because the branch moved on can be retried with force, which overwrites the branch.
        - Pull checks a branch out into a sandbox directory, or fast-forwards it; it never overwrites local
          changes. Use it to continue in a new sandbox from where an earlier one left off.
        - Branches, log, list files and read file show what a repository holds at a branch or commit.
        Push to a new branch rather than force-pushing when you are unsure whether to replace existing work.
      `,
    }),
  });

const skill: Skill.Definition = {
  key: Repository.SKILL_KEY,
  make,
};

export default skill;
