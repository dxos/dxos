//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import { Model } from '@dxos/ai';
import { McpServer, PlanningSkill } from '@dxos/assistant-toolkit';
import { Config } from '@dxos/client';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import * as Skill from '@dxos/compute/Skill';
import { EDGE_URLS } from '@dxos/config';
import { Blob, Collection, Database, Obj, Ref } from '@dxos/echo';
import { AccessToken } from '@dxos/link';
import * as WeatherSpace from '@dxos/plugin-debug/WeatherSpace';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import * as MarkdownSkill from '@dxos/plugin-markdown/MarkdownSkill';
import * as ProjectSkill from '@dxos/plugin-projects/ProjectSkill';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import { SandboxSkill } from '@dxos/plugin-sandbox';
import * as Sandbox from '@dxos/plugin-sandbox/Sandbox';
import * as SandboxOperation from '@dxos/plugin-sandbox/SandboxOperation';
import * as SandboxPlugin from '@dxos/plugin-sandbox/SandboxPlugin';
import * as DatabaseSkill from '@dxos/plugin-space/DatabaseSkill';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import { File } from '@dxos/types';

import { findObject } from '../assertions.ts';
import { createEvalRunner } from '../runner.ts';
import * as Scorer from '../Scorer.ts';
import { getDefaultSkills } from '../skills.ts';
import {
  CLAIM_URL,
  OPENING_PROMPT,
  PROJECT_NAME,
  SKILL_KEY,
  TASK_TITLES,
  WORKER_URL,
  evaluateHandOff,
  seed,
} from './weather-mcp/scenario.ts';

//
// The weather-MCP template, run end to end by the one session that writes the code: it builds a
// one-tool MCP server over the Open-Meteo forecast in a sandbox, deploys it with
// `wrangler deploy --temporary`, adds it to its own configuration by setting the URL on the
// template's Weather MCP skill, and then calls the tool itself.
//
// The goal graded is that last hand-off: the session picks up a server it configured mid-run, with
// no restart, and the call shows in its own transcript. Nothing outside the session talks to the
// Worker — a server only the eval could reach is not a server the chat can use.
//
// The hand-off itself is pinned offline in `weather-mcp/session.test.ts`; what this run adds is the
// Worker the session writes and the network between them. That network is the caveat: a temporary
// deployment answers a client Cloudflare takes for a bot with a managed challenge (HTTP 403,
// `cf-mitigated: challenge`, before CORS is even considered), and a datacenter egress — CI, a cloud
// sandbox — is one. From there the session configures the server and dials it every turn but never
// connects, and the `chess-mcp` eval probes its Worker from the EDGE sandbox for the same reason.
//

/** One Worker, one tool, one upstream: a session should be calling it well inside this. */
const TARGET_MINUTES = 10;
const BUDGET_MINUTES = 30;

/** The EDGE the run reaches for the DeepSeek variant's model and for the sandbox. */
const EDGE_URL = process.env.DX_EDGE_BASE_URL ?? EDGE_URLS.preview;

/** How the session got from configuring the server to calling it, read once for the scorers below. */
const handOff = Scorer.shared(
  Scorer.invocations.pipe(Effect.map((invocations) => evaluateHandOff(invocations, { server: WORKER_URL }))),
);

/** The servers the skill ends up listing — the configuration a chat actually reads. */
const configured = Scorer.shared(
  Effect.gen(function* () {
    const skill = yield* findObject(Skill.Skill, (candidate) => Obj.getMeta(candidate).key === SKILL_KEY);
    return skill?.mcpServers ?? [];
  }),
);

/** Everything the session filed on the project, as text. */
const filed = Scorer.shared(
  Effect.gen(function* () {
    const project = yield* findObject(Project.Project, (candidate) => candidate.name === PROJECT_NAME);
    const artifacts = yield* Effect.forEach(project?.artifacts ?? [], (ref) =>
      Database.load(ref).pipe(Effect.orElseSucceed(() => undefined)),
    );
    const texts = yield* Effect.forEach(
      artifacts.filter((candidate): candidate is Markdown.Document => Obj.instanceOf(Markdown.Document, candidate)),
      (document) =>
        Database.load(document.content).pipe(
          Effect.map((text) => text.content),
          Effect.orElseSucceed(() => ''),
        ),
    );
    return texts.join('\n');
  }),
);

const tasks = Scorer.shared(
  Effect.gen(function* () {
    const project = yield* findObject(Project.Project, (candidate) => candidate.name === PROJECT_NAME);
    const taskSet = project?.taskSet
      ? yield* Database.load(project.taskSet).pipe(Effect.orElseSucceed(() => undefined))
      : undefined;
    const loaded = yield* Effect.forEach(taskSet?.tasks ?? [], (ref) =>
      Database.load(ref).pipe(Effect.orElseSucceed(() => undefined)),
    );
    return TASK_TITLES.map((title) => loaded.find((task) => task?.title === title));
  }),
);

const SCORERS = [
  Scorer.make({
    name: 'picked-up-and-called-on-the-fly',
    description:
      'After the session put the server into its own configuration, it called the weather tool and got a forecast back.',
    score: handOff.pipe(Effect.map(({ calledAfterConfiguring }) => calledAfterConfiguring)),
  }),
  Scorer.make({
    name: 'weather-tool-called',
    description: "The session's transcript holds a successful call to the server's weather tool.",
    score: handOff.pipe(Effect.map(({ called }) => called)),
  }),
  Scorer.make({
    name: 'server-configured-on-skill',
    description: 'The Weather MCP skill lists the deployed workers.dev server over Streamable HTTP.',
    score: configured.pipe(
      Effect.map((servers) => servers.some(({ url, protocol }) => protocol === 'http' && WORKER_URL.test(url))),
    ),
  }),
  Scorer.make({
    name: 'worker-url-filed-claim-url-not',
    description: 'A project artifact carries the Worker URL, and none carries the claim URL.',
    score: filed.pipe(Effect.map((text) => WORKER_URL.test(text) && !CLAIM_URL.test(text))),
  }),
  Scorer.make({
    name: 'tasks-done',
    description: 'All four steps are done when the session finishes.',
    score: tasks.pipe(
      Effect.map(
        (steps) =>
          steps.filter((step) => step?.status === 'done' || step?.status === 'review').length / TASK_TITLES.length,
      ),
    ),
  }),
  Scorer.toolCalls({
    name: 'shell-was-used',
    description: 'The session opened a sandbox and ran commands in it.',
    score: (invocations) =>
      invocations.some(({ name }) => name === Operation.toolName(SandboxOperation.CreateSandbox)) &&
      invocations.some(({ name }) => name === Operation.toolName(SandboxOperation.Exec)),
  }),
  Scorer.duration({
    name: 'called-fast',
    description: `Full marks for calling the configured tool within ${TARGET_MINUTES} minutes, falling to none at ${BUDGET_MINUTES}.`,
    targetMinutes: TARGET_MINUTES,
    budgetMinutes: BUDGET_MINUTES,
    delivered: handOff.pipe(Effect.map(({ calledAfterConfiguring }) => calledAfterConfiguring)),
  }),
];

const task = createEvalRunner({
  instructions: OPENING_PROMPT,
  input: Schema.Unknown,
  output: Schema.Unknown,
  skills: () => [
    ...getDefaultSkills(),
    Ref.make(PlanningSkill.make()),
    Ref.make(MarkdownSkill.make()),
    Ref.make(ProjectSkill.make()),
    Ref.make(SandboxSkill.make()),
    // The step that configures the server writes the skill through the Database skill's update
    // tool; bound up front so the session does not have to find and enable it first.
    Ref.make(DatabaseSkill.make()),
  ],
  plugins: [ProjectsPlugin.make(), TasksPlugin.make(), MarkdownPlugin.make(), SandboxPlugin.make()],
  types: [
    ...WeatherSpace.make().schemas,
    Collection.Collection,
    Sandbox.Sandbox,
    // A sandbox names its credentials by this type; a space query that meets it unregistered fails.
    AccessToken.AccessToken,
    // A session may look for registered servers before configuring the skill; the type must resolve.
    McpServer.McpServer,
    File.File,
    Blob.Blob,
  ],
  config: new Config({ runtime: { services: { edge: { url: EDGE_URL } } } }),
  timeout: BUDGET_MINUTES * 60 * 1_000,
  gradeIncomplete: true,
  seed,
  scored: true,
});

/**
 * DeepSeek V4 Pro is what the story pre-selects for this template, served through EDGE with the run's
 * identity; Opus goes to Anthropic directly and needs `DX_ANTHROPIC_API_KEY`.
 */
const MODELS = [Model.claudeOpus5, Model.deepseekV4Pro].map((model) => ({
  name: model.backend,
  input: { model: model.id },
}));

/** `DX_EVAL_MODELS` narrows the variants, comma-separated; unset or empty runs them all. */
const selected = process.env.DX_EVAL_MODELS?.trim()
  ? process.env.DX_EVAL_MODELS.split(',').map((name) => name.trim())
  : undefined;
const VARIANTS = selected ? MODELS.filter(({ name }) => selected.includes(name)) : MODELS;

evalite.each(VARIANTS)('Weather MCP — the coding session deploys an MCP server, adds it to itself and calls it', {
  data: [{ input: null }],
  task,
  scorers: Scorer.toEvalite(SCORERS),
});
