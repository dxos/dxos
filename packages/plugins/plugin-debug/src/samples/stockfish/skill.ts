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
// Preferences, not mechanics: how work is tracked, where the code is written, and what counts as
// evidence. The mechanics of the sandbox (creating one, exec, file transfer) belong to
// `org.dxos.skill.sandbox` and are cross-referenced rather than restated — two copies of a
// procedure diverge, and the copy the model reads is the stale one.
//

const INSTRUCTIONS = trim`
  How multi-step development work is tracked and carried out here. These hold across a whole
  session, not one task, so keep this skill enabled for the duration.

  ## Tasks
  - One task per unit of work, never per batch. A batched task hides which parts landed and which
    were dropped.
  - One or two lines per description. Detail belongs in the design document or the README.
  - Work that ends in someone else's hands gets its own task, titled after the thing to act on and
    assigned to them — never buried in the task that produced the work.
  - Use the whole status range. \`blocked\` names what unblocks it; \`cancelled\` names why it was
    dropped. Deleting a dropped item loses reasoning someone will otherwise re-derive later.
  - Set status in the same turn the work completes, not in a batch at the end. The task list is how
    the reader watches this run, so a status set late is a status that was wrong while it mattered.
  - Respect \`dependsOn\`. A stage assumes the one before it deployed and was verified; starting one
    early is how a failure gets attributed to the wrong change.
  - Keep the outline scoped to the task in flight. Findings about another thread belong where that
    thread lives.

  ## Where the code is written
  - **You write it.** The sandbox is a shell you drive: you create the files, run the build, and read
    the failures. Creating a sandbox, running commands in it and moving files in and out are the
    Sandbox skill's (\`org.dxos.skill.sandbox\`) — enable it rather than working from memory.
  - **Do not hand the task to the harness in the image.** The sandbox image ships a coding agent of
    its own, and \`org.dxos.skill.deepseek\` will run it. It is the wrong tool here: it starts with
    none of this space's context — no brief, no task tree, no design document — and what it produces
    lands on a container filesystem instead of in this project. Use it only if the reader asks for it
    by name.
  - **One sandbox for the whole project.** It keeps its filesystem, its installed toolchain and its
    checkout between commands. A second one pays for all of that again and splits the tree in two.
  - **The container is not durable.** Anything that has to survive it — the design, the deploy
    output, the URLs — is filed as a project artifact in the same turn it is produced, not at the
    end.

  ## Deploying to Cloudflare
  - **No account, first deploy.** \`wrangler deploy --temporary\` mints a temporary account and
    prints a claim URL. The flag is not optional: plain \`wrangler deploy\` refuses in a
    non-interactive shell and demands a token, and an authentication prompt is a dead end for a
    session that cannot open a browser.
  - **The claim URL is a bearer credential; the Worker URL is not.** Anyone holding the claim URL can
    take ownership of the account, and a project artifact replicates in plaintext to everyone in the
    space — so file the Worker URL and hand the claim URL straight to the reader, logging it nowhere.
    Claiming needs a browser, so it is theirs to do; say that it expires with the Worker on it, which
    invalidates every later stage rather than only the current one.
  - **Deploy when the Worker changed, and verify every stage regardless.** A design stage has nothing
    to deploy and a stage that only registers or publishes changes no Worker code — deploying there is
    a no-op that reads as progress. Where you did deploy, a successful \`wrangler deploy\` is not
    evidence that anything is serving; the response body is.
  - **\`--temporary\` needs wrangler 4.102 or later, and that wrangler needs Node 22.** The sandbox
    runs Node 20, and a plain \`npm install wrangler\` there resolves to the last version that fits
    it, which has no \`--temporary\`. Install \`wrangler@latest\` explicitly and run its script under
    a newer node without touching the image: \`npm install wrangler@latest\`, then
    \`npx --yes node@22 node_modules/wrangler/bin/wrangler.js deploy --temporary\`.
  - **Read the deploy output for what it warns about, not only its exit code.** Bundle size and a
    missing binding are warnings on a deploy that succeeds and failures on the request that follows.
  - **Bound work by work, not by wall-clock.** \`Date.now()\` does not advance during synchronous
    compute in a Worker, so a time deadline never fires and every timing you report reads as zero.
    Count iterations, nodes or bytes instead.

  ## Models and credentials
  - The chat runs DeepSeek V4 Pro through the DXOS edge. No Anthropic key is involved in this
    project, and nothing here should ask for one.
  - Bind credentials by REFERENCE with the variable name to read them as. Never paste a secret into
    a prompt, a message or a shell command — a command line persists in the transcript and in the
    container's history.
  - A missing credential is a setup gap, not an error to stop on: name the connector the reader has
    to connect, then wait. Do not retry in the same turn.

  ## MCP servers
  - A server is registered as an object in the space, with the transport as \`http\` — Streamable
    HTTP. \`sse\` is the deprecated transport and is there for servers that have not migrated.
  - Its key replicates in plaintext to everyone in the space. Register a key the server can rotate,
    and never one that authorises anything beyond it.
  - A chat that does not list a registered server's tools has failed to connect. That is a URL,
    transport or handshake fault to diagnose — not a model that declined to use them.
  - Prove the tool was actually called. An answer a model could have produced from its own knowledge
    is not evidence the server is reachable; the tool call in the transcript is.

  ## GitHub and publishing
  - Publishing comes last, after the thing works. The two consent screens it needs are the only
    steps that leave this space, and a first run that meets them mid-build stops there.
  - An agent has no GitHub access of its own. Bind the space's token as \`GH_TOKEN\` before it is
    needed, not after a 401.
  - A connector token authorises access to repositories; it cannot CREATE one. Creating the
    repository is the reader's task and it comes first — the token is then scoped to that repository
    rather than to everything they own.
  - Tokens rotate. A session that was pushing fine and now gets 401 or 403 holds a stale copy:
    refresh the binding rather than restarting the session.

  ## What counts as evidence
  - Set the bar at execution, not compilation. "It builds" and "it parses" are not evidence: require
    the thing to be RUN, and say what could not be exercised.
  - A brief's premise is often wrong; expect it to be falsified. Ask what the real mechanism is
    before changing the thing that looks like it, and re-ask when the previous answer was itself a
    correction.
  - When a measurement is corrected, sweep every conclusion that shared the flawed method. A bad
    instrument invalidates results already banked; failing to propagate the fix backwards is the
    expensive mistake.
  - "Could not run it here" is an environment limit, not a behavioural difference. Only the second is
    a stop; label the first untested rather than letting it read as a pass.
  - The sandbox's own state contaminates results: tooling installed earlier makes a capability look
    available when it is not. Verify a from-scratch claim in a clean container.
  - A green build is not proof. Assignment and type erasure hide shape mismatches that fail only at
    runtime — and a Worker's runtime is not node's, so a module that resolves locally can still be
    missing at the edge.
  - Distinguish cited from executed evidence. A comment describing a failure is a claim being
    relayed, not a result; a load-bearing decision deserves a reproduction.
  - Be terse about the plumbing. Creating a sandbox, installing a toolchain and each command that
    found nothing are not worth narrating. What the reader wants is the outcome — the URL, the tool
    response, the failure. Say something mid-flight only when they have to act.
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
          description: 'How work is tracked, where the code is written, and what counts as evidence.',
          instructions: Template.make({ source: INSTRUCTIONS }),
          agentCanEnable: true,
        }),
      );

      return { skill };
    }),
});
