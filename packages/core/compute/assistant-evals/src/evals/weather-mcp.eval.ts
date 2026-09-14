//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import { Model } from '@dxos/ai';
import * as Capability from '@dxos/app-framework/Capability';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { McpServer, PlanningSkill } from '@dxos/assistant-toolkit';
import * as Chat from '@dxos/assistant/Chat';
import { Config } from '@dxos/client';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import * as Skill from '@dxos/compute/Skill';
import { EDGE_URLS } from '@dxos/config';
import { Blob, Collection, Database, Feed, Obj, Ref } from '@dxos/echo';
import { AccessToken } from '@dxos/link';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { WeatherSpace } from '@dxos/plugin-debug/sample';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import * as MarkdownSkill from '@dxos/plugin-markdown/MarkdownSkill';
import * as ProjectSkill from '@dxos/plugin-projects/ProjectSkill';
import * as ProjectsPlugin from '@dxos/plugin-projects/ProjectsPlugin';
import { SandboxSkill } from '@dxos/plugin-sandbox';
import * as Sandbox from '@dxos/plugin-sandbox/Sandbox';
import * as SandboxOperation from '@dxos/plugin-sandbox/SandboxOperation';
import * as SandboxPlugin from '@dxos/plugin-sandbox/SandboxPlugin';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import { File, Task } from '@dxos/types';
import { trim } from '@dxos/util';

import { type ToolInvocation, findObject } from '../assertions.ts';
import { createEvalRunner } from '../runner.ts';
import * as Scorer from '../Scorer.ts';
import { getDefaultSkills } from '../skills.ts';

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

const PROJECT_NAME = 'Weather MCP';
const SKILL_KEY = 'org.dxos.skill.weatherMcp';

/** The template's four steps, all the session's. */
const TASK_TITLES = [
  'Build the weather MCP Worker',
  'Deploy it to a temporary Cloudflare account',
  'Configure the server for this space',
  'Test the tool from this chat',
];

/** One Worker, one tool, one upstream: a session should be calling it well inside this. */
const TARGET_MINUTES = 10;
const BUDGET_MINUTES = 30;

/** The EDGE the run reaches for the DeepSeek variant's model and for the sandbox. */
const EDGE_URL = process.env.DX_EDGE_BASE_URL ?? EDGE_URLS.preview;

const WORKER_URL = /https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev/i;
const CLAIM_URL = /https:\/\/dash\.cloudflare\.com\/claim/i;

/** A forecast carries a temperature: a number next to a degree sign or the field name. */
const TEMPERATURE = /(?:temperature[^\d-]{0,40}-?\d+(?:\.\d+)?|-?\d+(?:\.\d+)?\s*°)/i;

const OPENING_PROMPT = trim`
  You have been assigned tasks to work on in this session.
  Read all tasks, then work on them sequentially and on your own — do not stop to ask; nothing in
  this project needs the reader. The task descriptions are the specification.
  Update the tasklist as you work on each task, and mark each task done as you complete it.
`;

/**
 * The session's calls to the deployed server's weather tool that came back with a forecast. MCP tools
 * carry no operation key, which separates the server's tool from a sandbox command that curled the
 * upstream API directly.
 */
const isWeatherCall = ({ name, operationKey, error, result }: ToolInvocation): boolean =>
  !operationKey && /weather|forecast/i.test(name) && !error && TEMPERATURE.test(JSON.stringify(result ?? ''));

/** The session's own write that put the server into its configuration. */
const isConfiguration = ({ input, error }: ToolInvocation): boolean =>
  !error && input.includes('mcpServers') && WORKER_URL.test(input);

/** How the session got from configuring the server to calling it, read once for the scorers below. */
const handOff = Scorer.shared(
  Scorer.invocations.pipe(
    Effect.map((invocations) => {
      const configuredAt = invocations.find(isConfiguration)?.calledAt;
      const calls = invocations.filter(isWeatherCall);
      return {
        configured: configuredAt !== undefined,
        called: calls.length > 0,
        // Picked up on the fly: the call comes after the write, in the same session, with no restart.
        calledAfterConfiguring:
          configuredAt !== undefined && calls.some(({ calledAt }) => calledAt !== undefined && calledAt > configuredAt),
      };
    }),
  ),
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
  ],
  plugins: [ProjectsPlugin.make(), TasksPlugin.make(), MarkdownPlugin.make(), SandboxPlugin.make()],
  types: [
    ...WeatherSpace().schemas,
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
  seed: ({ spaceId, instructions }) =>
    Effect.gen(function* () {
      const client = yield* Capability.get(ClientCapabilities.Client);
      const space = client.spaces.get(spaceId);
      if (!space) {
        return yield* Effect.fail(new Error(`Space not found: ${spaceId}`));
      }
      yield* SampleSpace.applyTo(WeatherSpace(), space);

      const project = yield* findObject(Project.Project, (candidate) => candidate.name === PROJECT_NAME);
      if (!project?.taskSet || !project.instructions) {
        return yield* Effect.fail(new Error('The template did not produce the project.'));
      }
      const taskSet = yield* Database.load(project.taskSet);
      const steps = (yield* Effect.forEach(taskSet.tasks, (ref) => Database.load(ref))).filter((candidate) =>
        TASK_TITLES.includes(candidate.title),
      );
      if (steps.length !== TASK_TITLES.length) {
        return yield* Effect.fail(new Error('The template did not produce the four steps.'));
      }

      // The Weather MCP skill reaches the session through the project's instructions, which a
      // delegated session does not bind yet. It is the session's own configuration: the server the
      // run sets on it is connected at the start of the session's next turn.
      const projectInstructions = yield* Database.load(project.instructions);
      for (const ref of projectInstructions.skills) {
        const skill = yield* Database.load(ref);
        Obj.update(instructions, (instructions) => {
          instructions.skills.push(Ref.make(skill));
        });
      }

      // The chat the session runs on, carrying the four steps and filed under the project.
      const feed = yield* Database.add(Feed.make());
      const chat = yield* Database.add(Chat.make({ name: PROJECT_NAME, feed: Ref.make(feed) }));
      Chat.assignTasks(
        chat,
        steps.map((step: Task.Task) => Ref.make(step)),
      );
      Chat.linkCompanion({ chat, subject: project });
      yield* Database.flush();

      return { objects: [Ref.make(project)], chat: Ref.make(chat) };
    }),
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
