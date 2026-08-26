//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { ComputerOperation } from '#types';

const SKILL_KEY = 'org.dxos.skill.computer';

const operations = [ComputerOperation.Bash, ComputerOperation.Edits];

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Coding (Dev)',
    description: trim`
      Proof of concept, dev only. A minimal coding harness: run shell commands and apply exact file
      edits on the developer's own machine, through the vite dev server serving this app. Enable it to
      read, change and verify code in the working tree that server was started against. Outside a dev
      server — any deployed Composer — there is no such route and both tools fail.
    `,
    // Not agent-enablable: shell access on the developer's machine is a decision for the developer,
    // and an agent that could turn it on mid-conversation would be making that decision for them.
    agentCanEnable: false,
    tools: Skill.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        {{! Coding (Dev) }}

        You can run shell commands and edit files in a working tree on the developer's machine. This
        is their real checkout, not a sandbox: an edit is immediately visible to their editor, their
        dev server and their git status.

        This harness is a proof of concept and exists only while a vite dev server hosts it. If the
        tools report that the host is not mounted, no command will work until the developer fixes
        that — say so rather than looking for another way in.

        How to work:
        - Orient first. Run one bash command to see where you are and what is there (pwd, ls, git
          status --short). Every result reports the absolute directory it ran in.
        - Read before you write. Use bash (cat, sed -n '1,80p', rg -n) to see the exact text,
          then quote it back in an edit. Never edit a file you have not read in this conversation.
        - Edit with the ${Operation.toolName(ComputerOperation.Edits)} tool, not with sed, awk or a heredoc. It matches literal text, applies a
          whole batch or nothing at all, and tells you what matched — a shell rewrite silently
          succeeds when it changed the wrong line.
        - Verify with bash. Re-read the changed region, and run the project's own checks (its test,
          lint or build command) when the change is more than cosmetic.
        - Work in small steps and report what you did after each one, including the command you ran.

        Reading output:
        - A non-zero exitCode is a normal result. Read stderr, say what it means, and adjust.
        - truncated: true means the output was clipped — re-run something narrower (add head, a path
          filter, or --quiet) rather than asking for the same dump again.
        - timedOut: true means the command was killed. Long builds need an explicit larger timeout.
        - Keep output small on purpose: pipe through head, grep for what you need, and prefer
          git diff --stat over git diff on a wide change.

        Be careful, and ask first:
        - Never run a command that destroys work that is not committed: rm -rf, git reset --hard,
          git clean, git checkout -- ., truncation via >, or anything that rewrites history.
        - Never run a command that reaches outside the working tree — installing packages globally,
          changing the developer's configuration, or touching their home directory.
        - Do not push, publish, deploy, or open a pull request unless the developer asks in this
          conversation.
        - Do not read or print credentials (.env files, tokens, key material), and do not send file
          contents anywhere except back into this conversation.
        - When a task needs one of the above, say what you would run and why, and wait.

        If a tool reports that the host is unreachable, the harness is not mounted: the app is not
        being served by a dev server with the computer vite plugin. Say so plainly — no command
        will work until the developer fixes it.
      `,
    }),
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
