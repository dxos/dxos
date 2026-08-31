//
// Copyright 2026 DXOS.org
//

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { DEEPSEEK_API_KEY_ENV, DEEPSEEK_SKILL_KEY, DEEPSEEK_SOURCE } from '../constants';
import { InstallHarness, RunHarness } from './operations';

const make = () =>
  Skill.make({
    key: DEEPSEEK_SKILL_KEY,
    name: 'DeepSeek',
    description: 'Run the DeepSeek harness in a sandbox container using the space’s DeepSeek API key.',
    // Enabled by the agent on demand: the harness is a tool it reaches for mid-task, and the
    // credential is already connected by the time it matters.
    agentCanEnable: true,
    tools: Skill.toolDefinitions({ operations: [InstallHarness, RunHarness] }),
    instructions: Template.make({
      source: trim`
        The DeepSeek harness is DeepSeek's own coding agent, run inside a sandbox container — an
        isolated shell environment the sandbox service provisions on first use. Use it to hand a
        self-contained coding or analysis task to DeepSeek and read back what it produced.

        ## The shape of the flow
        1. Install DeepSeek Harness — creates the sandbox, binds the space's DeepSeek credential
           to it, and installs the harness CLI. Returns a \`sandboxId\`; do this once per sandbox,
           not once per prompt.
        2. Run DeepSeek Harness — runs the harness on a prompt in that sandbox and returns its
           stdout, stderr and exit code. Re-run it as often as needed with the same \`sandboxId\`;
           the sandbox keeps its filesystem between runs, so a follow-up prompt sees the earlier
           run's output on disk.

        Reuse the sandbox from a previous install when you still have its id. Installing again
        creates a second container and reinstalls the CLI for nothing.

        ## Credentials
        The API key is never passed to a tool and never enters the conversation. It is bound to the
        sandbox by reference and resolved into the container's ${DEEPSEEK_API_KEY_ENV} on each run.

        When Install DeepSeek Harness fails with MissingCredentialError the DeepSeek account is
        not connected yet. That is a setup gap, not an error to report and stop on:
        1. Emit the connector prompt so the user can connect inline:
           \`<surface role='integration-prompt' data='{"service":"${DEEPSEEK_SOURCE}"}' />\`
        2. Say that connecting DeepSeek lets you continue, then stop and wait — do not retry in the
           same turn, and never ask the user to paste a key into the conversation.

        ## Reading a result
        A non-zero \`exitCode\` is the harness's own failure, not a transport error: report its
        \`stderr\` rather than retrying blindly. Long runs are bounded by a timeout; if a run is cut
        off, narrow the prompt rather than raising the timeout indefinitely.
      `,
    }),
  });

const skill: Skill.Definition = {
  key: DEEPSEEK_SKILL_KEY,
  make,
};

export default skill;
