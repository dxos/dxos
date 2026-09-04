//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { Database } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

//
// Durable working preferences, seeded as a space object so a project's instructions can bind them.
//
// Preferences, not mechanics: how work is tracked, how an agent is briefed, and what counts as
// evidence. The mechanics of managed agents (create, deploy, sessions, credentials) belong to
// `org.dxos.skill.claude` and are cross-referenced rather than restated — two copies of a procedure
// diverge, and the copy the model reads is the stale one.
//

const INSTRUCTIONS = trim`
  How multi-step development work is tracked and delegated here. These hold across a whole session,
  not one task, so keep this skill enabled for the duration.

  ## Tasks
  - One task per unit of work, never per batch. A batched task hides which parts landed and which
    were dropped. This governs the LEDGER, not PR size.
  - Batch the work, not the ledger: many units in one PR and one agent work-cycle, still one task
    each. Small PRs cost a review round-trip apiece and stall on approval latency; a larger PR still
    owes per-unit evidence and an explicit list of what was dropped and why.
  - One or two lines per description. Detail belongs in the design document or the PR body.
  - Work that ends in someone else's hands gets its own task, titled after the thing to act on
    (\`Review <link>\`) and assigned to them — never buried in the task that produced the work.
  - Keep an open \`Merge PR <n>\` task until the PR is CONFIRMED merged. Approved is not merged;
    queued is not merged.
  - Use the whole status range. \`blocked\` names what unblocks it; \`cancelled\` names why it was
    dropped. Deleting a dropped item loses reasoning someone will otherwise re-derive later.
  - Set status in the same turn the work completes, not in a batch at the end.
  - Keep the outline scoped to the task in flight. Findings about another thread belong where that
    thread lives.

  ## Briefing an agent
  - State the scope fence, including what is OUT of scope. Adjacent work is the default failure mode.
  - Demand triage with counts BEFORE any edit, so mis-scoped work surfaces before effort is spent.
  - Set the bar at execution, not compilation. "It builds" and "it parses" are not evidence: require
    the thing to be RUN, and require a list of what could not be exercised.
  - Give an explicit stop rule — any verified divergence drops that item and is reported — otherwise
    a real break becomes a footnote in a PR that ships.
  - Authorise refusal. "This slice isn't worth it, here's the better one" is a success; without
    saying so, a mis-scoped brief produces a padded PR instead of a correction.
  - Ask what was NOT tested. The caveats are usually more decision-relevant than the results.
  - Give standing behaviour (ownership rules, the verification bar) once in the system prompt, not
    repeated per message.

  ## Claude managed agents
  Creating, deploying, sessions and credentials are the Claude Agents skill's
  (\`org.dxos.skill.claude\`) — enable it rather than working from memory. What belongs here:
  - Bind credentials by REFERENCE with the variable name to read them as. Never paste a secret into
    a prompt or a message; both persist in the session's history.
  - Reuse one session per work-stream. It keeps its cloned repos, installed tooling and accumulated
    context; a new session pays for all of that again.
  - Poll the transcript; it does not notify. \`running\` with no new prose is normal — tool calls and
    thinking are not surfaced. Set a wake timer and re-read rather than assuming completion.
  - An empty transcript window is not a stall: it returns recent events only, and a long report
    pushes earlier ones out of view. Check elapsed time and status first, and never restart a session
    on the strength of a quiet window.
  - On idle read \`stopReason\`: \`end_turn\` finished, \`requires_action\` is blocked and waiting,
    \`budget_reached\` hit a spending cap.
  - **Be terse about the interaction itself.** Delegating to an agent is plumbing: do not narrate
    creating it, deploying it, starting a session, sending a message, or each poll that found nothing
    new. What the reader wants is the task's outcome — the PR, the URL, the failure — not a running
    commentary on the errand. Say something mid-flight only when they have to act (a credential to
    connect, a decision to make, \`requires_action\` or \`budget_reached\`), when the delegation
    itself failed, or when they ask. One line is enough for "delegated, will report back".

  ## GitHub and pull requests
  - An agent has no GitHub access of its own. Bind the space's token as \`GH_TOKEN\` before it is
    needed, not after a 401.
  - A connector token authorises access to repositories; it cannot CREATE one. Creating the
    repository is the reader's task, and it comes first — the token is then scoped to that
    repository rather than to everything they own.
  - Tokens rotate. A session that was pushing fine and now gets 401 or 403 holds a stale copy:
    refresh the binding rather than restarting the session or starting a second one.
  - One PR per work-cycle, with per-unit evidence in the body and an explicit dropped list.
  - Fix the existing PR rather than opening a replacement.
  - A merge-queued PR is push-locked. Dequeue before pushing a fix.
  - Surface a bypassed guardrail — a skipped pre-push hook — in review rather than burying it.

  ## What counts as evidence
  - A brief's premise is often wrong; expect it to be falsified. Ask what the real mechanism is
    before changing the thing that looks like it, and re-ask when the previous answer was itself a
    correction.
  - When a measurement is corrected, sweep every conclusion that shared the flawed method. A bad
    instrument invalidates results already banked; failing to propagate the fix backwards is the
    expensive mistake.
  - Control for pre-existing nondeterminism before calling a difference a regression. Two control
    runs can agree by luck — widen the sample.
  - "Could not run it here" is an environment limit, not a behavioural difference. Only the second is
    a stop; label the first untested rather than letting it read as a pass.
  - Separate declarations from resolved effect when counting. Decompose a favourable ratio by
    distinct shape before trusting it.
  - The agent's own environment contaminates results: tooling it installed earlier makes a
    capability look available when it is not. Verify in a clean environment.
  - A finding in one repo does not transfer to its sibling. Re-prove environment assumptions per
    repo; near-identical setups diverge in exactly the load-bearing detail.
  - A green build is not proof. Assignment and type erasure hide shape mismatches that fail only at
    runtime.
  - Byte-identity is the right bar only where bytes are the contract. Elsewhere assert round-trip and
    shape, and record why byte equality does not hold.
  - Distinguish cited from executed evidence. A committed comment describing a failure is a claim
    being relayed, not a result; a load-bearing decision deserves a reproduction.
  - A tool that fixes a bug by accident is not thereby safe. Something broken under the old runtime
    and working under the new one has no baseline to prove equivalence against — a blocker, not a win.
`;

export type SkillResult = { skill: Skill.Skill };

/** The development-preferences skill, as a space object a project's instructions can bind. */
export const DevelopmentSkill: SampleSpace.Phase<SkillResult> = SampleSpace.phase('skill', {
  schemas: [Skill.Skill, Text.Text],
  run: () =>
    Effect.gen(function* () {
      const skill = yield* Database.add(
        Skill.make({
          key: 'org.dxos.skill.development',
          name: 'Development',
          description: 'How work is tracked, how agents are briefed, and what counts as evidence.',
          instructions: Template.make({ source: INSTRUCTIONS }),
          agentCanEnable: true,
        }),
      );

      return { skill };
    }),
});
