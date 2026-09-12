//
// Copyright 2026 DXOS.org
//

import { Chess } from 'chess.js';
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
import { EDGE_URLS } from '@dxos/config';
import { Blob, Collection, Database, Feed, Obj, Ref } from '@dxos/echo';
import { AccessToken } from '@dxos/link';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { StockfishSpace } from '@dxos/plugin-debug/sample';
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
import { type Actor, File, Task } from '@dxos/types';
import { trim } from '@dxos/util';

import { type ToolInvocation, findObject } from '../assertions.ts';
import { createEvalRunner } from '../runner.ts';
import * as Scorer from '../Scorer.ts';
import { getDefaultSkills } from '../skills.ts';
import MCP_PROBE from './chess-mcp/mcp-probe.mjs?raw';

//
// The chess-MCP template, delegated end to end: a design, an empty Worker deployed with
// `wrangler deploy --temporary`, and an MCP server over a chess engine on that Worker, built by the
// assistant in a sandbox with no coding agent between them.
//
// The space is the debug plugin's stockfish sample. The session gets what `DelegateTaskToChat`
// gives one — the three agent-owned stages on its checklist, the sandbox skill alongside planning,
// markdown and project — plus the space's own Development skill, which the project's instructions
// bind for a companion chat. Stages four and five need the reader (a plugin to enable, a repository
// to own) and stay behind.
//
// What is scored is the server, not the transcript: the eval speaks MCP to the Worker URL the
// session filed — initialize, `tools/list`, and a best-move call on the seeded position — and holds
// the answer to the rules of chess. The handshake runs from the session's own sandbox, because a
// temporary deployment challenges clients it takes for bots and the eval process is one.
//

const PROJECT_NAME = 'Chess MCP on Workers';

/** The stages a session is given. The two after them need the reader and stay behind. */
const DELEGATED_STAGES = [
  'Design the tool surface and write it down',
  'Deploy an empty Worker with no Cloudflare login',
  'Implement the MCP server and the engine',
];

/**
 * How long the three stages should take. A design, an empty deploy and a small MCP server over an
 * engine is not a large piece of work; a session that serves the engine within this scores full
 * marks for speed, and the score falls to nothing at the hour the run is given. Both are guesses to
 * tune against runs.
 */
const TARGET_MINUTES = 15;
const BUDGET_MINUTES = 60;

/** The seeded game, five moves into a Spanish opening, as the position the engine is asked about. */
const SEEDED_FEN = 'r1bqk2r/1pppbppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 4 6';

/**
 * The EDGE the run reaches: it serves the model for the DeepSeek variant, authenticated as the run's
 * own identity, and the sandbox for both. Preview, as the runner defaults: dev has no DeepSeek route.
 */
const EDGE_URL = process.env.DX_EDGE_BASE_URL ?? EDGE_URLS.preview;

/** A deployed Worker, with whatever path the session put its endpoint on. */
const WORKER_URL = /https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev(?:\/[\w./-]*)?/gi;
const CLAIM_URL = /https:\/\/dash\.cloudflare\.com\/claim/i;

/** The prompt `DelegateTaskToChat` opens the session with. */
const OPENING_PROMPT = trim`
  You have been assigned tasks to work on in this session.
  Read all tasks, then work on them sequentially.
  This may require you to read, update, or create artifacts associated with the project.
  Update the tasklist as you work on each task, and mark tasks ready for review as you complete them.
`;

/** The eval identity as the delegating reviewer, so a finished task lands in review rather than done. */
const REVIEWER: Actor.Actor = { role: 'user', name: 'Eval' };

type Probe = {
  endpoint?: string;
  tools: string[];
  bestMove?: string;
  evaluation?: string;
  errors: string[];
};

const parseProbe = (stdout: string): Probe | undefined => {
  const last = stdout.trim().split('\n').pop();
  try {
    return last ? JSON.parse(last) : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Whether a tool's answer names a legal move in the seeded position, in SAN or in UCI. The reply
 * is free text, so every token that looks like a move is tried against the rules.
 */
const namesLegalMove = (answer: string | undefined): boolean => {
  if (!answer) {
    return false;
  }
  const tokens =
    answer.match(/\b(?:[a-h][1-8][a-h][1-8][qrbn]?|O-O(?:-O)?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)\b/g) ??
    [];
  return tokens.some((token) => {
    const game = new Chess(SEEDED_FEN);
    try {
      return game.move(token) !== null;
    } catch {
      return false;
    }
  });
};

/**
 * A score somewhere in the evaluation's text: centipawns, pawns, or a mate count. The token has to
 * look like a score — a bare digit is not one, or a reply that only echoed a UCI move would pass.
 */
const namesAScore = (answer: string | undefined): boolean =>
  !!answer &&
  (/(?:^|[^a-z\d])[+-]\d+(?:\.\d+)?(?![a-z\d])/i.test(answer) ||
    /\b\d+\.\d+\b/.test(answer) ||
    /\b(?:cp|centipawns?|score|mate)\b/i.test(answer)) &&
  !/error/i.test(answer.slice(0, 40));

//
// What the session left, read once and shared: each query below is one effect value, and a run
// answers a given query once however many scorers name it — so the expensive ones, the handshake
// with the deployed Worker above all, are not paid for again by each scorer that reads them.
//

/** Everything the session filed on the project, as text, with what a reader looks for in it. */
const filedArtifacts = Effect.gen(function* () {
  const project = yield* findObject(Project.Project, (candidate) => candidate.name === PROJECT_NAME);
  if (!project) {
    return { filed: '', design: undefined, workerUrls: [] as string[] };
  }
  const artifacts = yield* Effect.forEach(project.artifacts, (ref) =>
    Database.load(ref).pipe(Effect.orElseSucceed(() => undefined)),
  );
  const documents = artifacts.filter((candidate): candidate is Markdown.Document =>
    Obj.instanceOf(Markdown.Document, candidate),
  );
  const texts = yield* Effect.forEach(documents, (document) =>
    Database.load(document.content).pipe(
      Effect.map((text) => ({ name: document.name ?? '', content: text.content })),
      Effect.orElseSucceed(() => ({ name: document.name ?? '', content: '' })),
    ),
  );
  const filed = texts.map(({ content }) => content).join('\n');
  return {
    filed,
    design: texts.find(({ name, content }) => /design/i.test(name) || /^#.*design/im.test(content)),
    workerUrls: [...new Set((filed.match(WORKER_URL) ?? []).map((url) => url.replace(/[.,)]+$/, '')))],
  };
});

/**
 * The handshake, from the sandbox the session built in: a temporary deployment challenges clients
 * it takes for bots and the eval process is one. Candidates are every Worker URL it filed, bare
 * host first, then with the paths it mentioned and the conventional `/mcp`.
 */
const engine = Effect.gen(function* () {
  const { workerUrls } = yield* filedArtifacts;
  const sandbox = yield* findObject(Sandbox.Sandbox, () => true);
  // Named in the value so the container, which outlives the run, can be inspected afterwards.
  const sandboxId = sandbox?.id;
  if (workerUrls.length === 0 || !sandbox) {
    return { sandboxId, probe: undefined as Probe | undefined };
  }
  const spaceId = yield* Database.spaceId;
  const hosts = [...new Set(workerUrls.map((url) => new URL(url).origin))];
  const candidates = [...new Set([...workerUrls, ...hosts.map((host) => `${host}/mcp`), ...hosts])];
  const command = `cat > /tmp/mcp-probe.mjs <<'PROBE'\n${MCP_PROBE}\nPROBE\nnode /tmp/mcp-probe.mjs '${SEEDED_FEN}' ${candidates.map((url) => `'${url}'`).join(' ')}`;
  const result = yield* Operation.invoke(
    SandboxOperation.Exec,
    { sandbox: Ref.make(sandbox), command, timeout: 3 * 60 * 1_000 },
    { spaceId },
  ).pipe(Effect.orElseSucceed(() => undefined));
  return { sandboxId, probe: result ? parseProbe(result.stdout) : undefined };
});

/** The checklist as the session left it: the three stages it was given, and the work that was not. */
const checklist = Effect.gen(function* () {
  const empty = {
    delegated: [] as (Task.Task | undefined)[],
    readerSteps: [] as (Task.Task | undefined)[],
    later: [] as (Task.Task | undefined)[],
  };
  const project = yield* findObject(Project.Project, (candidate) => candidate.name === PROJECT_NAME);
  if (!project?.taskSet) {
    return empty;
  }
  const taskSet = yield* Database.load(project.taskSet).pipe(Effect.orElseSucceed(() => undefined));
  if (!taskSet) {
    return empty;
  }
  const tasks = yield* Effect.forEach(taskSet.tasks, (ref) =>
    Database.load(ref).pipe(Effect.orElseSucceed(() => undefined)),
  );
  const delegated = DELEGATED_STAGES.map((title) => tasks.find((candidate) => candidate?.title === title));
  return {
    delegated,
    readerSteps: tasks.filter((candidate) => candidate?.assignee?.role === 'user'),
    later: tasks.filter((candidate) => {
      const parentTask = candidate?.parentTask;
      return (
        parentTask !== undefined &&
        candidate?.assignee?.role !== 'assistant' &&
        candidate?.assignee?.role !== 'user' &&
        !DELEGATED_STAGES.includes(candidate?.title ?? '') &&
        !delegated.some((stage) => stage && Task.refEntityId(parentTask) === stage.id)
      );
    }),
  };
});

/**
 * Where the hour went: each call with when it started (seconds into the run), how long the tool
 * took, and the wait before it (the model's turn). Inputs and results are excerpts.
 */
const timelineOf = (invocations: readonly ToolInvocation[]) => {
  const start = invocations[0]?.calledAt ?? 0;
  let previousResult = start;
  const timeline = invocations.map(({ name, input, result, error, calledAt, resultAt }) => {
    const entry = {
      at: Math.round(((calledAt ?? previousResult) - start) / 1_000),
      waitMs: (calledAt ?? previousResult) - previousResult,
      tookMs: resultAt !== undefined && calledAt !== undefined ? resultAt - calledAt : undefined,
      name,
      input: input.slice(0, 200),
      result: error ?? JSON.stringify(result ?? '').slice(0, 200),
    };
    previousResult = resultAt ?? previousResult;
    return entry;
  });
  const sum = (values: (number | undefined)[]) => values.reduce<number>((total, value) => total + (value ?? 0), 0);
  return {
    execCalls: invocations.filter(({ name }) => name === Operation.toolName(SandboxOperation.Exec)).length,
    sandboxCreated: invocations.some(({ name }) => name === Operation.toolName(SandboxOperation.CreateSandbox)),
    toolSeconds: Math.round(sum(timeline.map(({ tookMs }) => tookMs)) / 1_000),
    modelSeconds: Math.round(sum(timeline.map(({ waitMs }) => waitMs)) / 1_000),
    timeline,
  };
};

const SCORERS = [
  Scorer.make({
    name: 'design-filed-with-diagram',
    description: 'A design artifact is on the project and carries a mermaid diagram of the request path.',
    query: filedArtifacts,
    score: ({ design }) =>
      [!!design && design.content.length > 200, !!design && /```mermaid/.test(design.content)].filter(Boolean).length /
      2,
  }),
  Scorer.make({
    name: 'shell-was-used',
    description: 'The session opened a sandbox and ran commands in it.',
    // The timeline is the value, so a reader of the run sees where its hour went next to the mark.
    query: Scorer.invocations.pipe(Effect.map(timelineOf)),
    score: ({ sandboxCreated, execCalls }) => sandboxCreated && execCalls > 0,
  }),
  Scorer.make({
    name: 'worker-url-filed-claim-url-not',
    description: 'A project artifact carries the Worker URL, and none carries the claim URL.',
    query: filedArtifacts,
    // The claim URL is a bearer credential for the account; the skill says to file it nowhere.
    score: ({ filed, workerUrls }) => workerUrls.length > 0 && !CLAIM_URL.test(filed),
  }),
  Scorer.make({
    name: 'mcp-handshake-lists-two-tools',
    description: 'The filed URL answers initialize and tools/list over Streamable HTTP with two tools.',
    query: engine,
    score: ({ probe }) => {
      const listed = probe?.tools.length ?? 0;
      return listed >= 2 ? 1 : listed > 0 ? 0.5 : 0;
    },
  }),
  Scorer.make({
    name: 'best-move-is-legal',
    description: 'The move tool, called with the seeded position, names a move that is legal in it.',
    query: engine,
    score: ({ probe }) => namesLegalMove(probe?.bestMove),
  }),
  Scorer.make({
    name: 'evaluation-returns-a-score',
    description: 'The evaluate tool, called with the seeded position, returns a score.',
    query: engine,
    score: ({ probe }) => namesAScore(probe?.evaluation),
  }),
  Scorer.make({
    name: 'delegated-stages-in-review',
    description: 'Every stage the session was given is in review (or done) when it finishes.',
    query: checklist,
    // `done` past a named reviewer lands as `review`; either means the session finished the stage.
    // The denominator is the stages it was given, so renaming one away cannot raise the score.
    score: ({ delegated }) =>
      delegated.filter((stage) => stage?.status === 'review' || stage?.status === 'done').length /
      DELEGATED_STAGES.length,
  }),
  Scorer.make({
    name: 'reader-and-later-work-left-alone',
    description: "The reader's steps and the two undelegated stages are still to do, or marked blocked on the reader.",
    query: checklist,
    score: ({ readerSteps, later }) =>
      [
        // The model choice, the claim and the GitHub steps are the reader's, and cannot be done here.
        readerSteps.length > 0 && readerSteps.every((step) => step?.status === 'todo'),
        // The steps of stages four and five, and the stages themselves, were not delegated. Marking
        // one blocked on the reader is the Development skill's own instruction, not work on it.
        later.length > 0 && later.every((step) => step?.status === 'todo' || step?.status === 'blocked'),
      ].filter(Boolean).length / 2,
  }),
  Scorer.toolCalls({
    name: 'no-tool-errors',
    description: 'No tool call errored during the session.',
    score: (invocations) => invocations.every(({ error }) => !error),
  }),
  Scorer.duration({
    name: 'served-the-engine-fast',
    description: `Full marks for a working best-move tool within ${TARGET_MINUTES} minutes, falling to none at ${BUDGET_MINUTES}; nothing for a server that does not answer.`,
    targetMinutes: TARGET_MINUTES,
    budgetMinutes: BUDGET_MINUTES,
    when: engine,
    delivered: ({ probe }) => namesLegalMove(probe?.bestMove),
  }),
];

const task = createEvalRunner({
  instructions: OPENING_PROMPT,
  input: Schema.Unknown,
  output: Schema.Unknown,
  // What `bindDelegationContext` binds, plus the defaults every chat has.
  skills: () => [
    ...getDefaultSkills(),
    Ref.make(PlanningSkill.make()),
    Ref.make(MarkdownSkill.make()),
    Ref.make(ProjectSkill.make()),
    Ref.make(SandboxSkill.make()),
  ],
  plugins: [ProjectsPlugin.make(), TasksPlugin.make(), MarkdownPlugin.make(), SandboxPlugin.make()],
  types: [
    ...StockfishSpace().schemas,
    Collection.Collection,
    Sandbox.Sandbox,
    // A sandbox names its credentials by this type; a space query that meets it unregistered fails.
    AccessToken.AccessToken,
    // Stage four registers one; a session that looks for it early must find the type, not an error.
    McpServer.McpServer,
    // What the sandbox's download tool persists: a session that pulls its source into the space
    // must land it, not an unregistered-schema error.
    File.File,
    Blob.Blob,
  ],
  config: new Config({ runtime: { services: { edge: { url: EDGE_URL } } } }),
  // A design, a toolchain install, two deploys and an engine, each minutes of wall clock; and where a
  // session got to in that hour is worth grading even when it did not finish.
  timeout: 60 * 60 * 1_000,
  gradeIncomplete: true,
  seed: ({ spaceId, instructions }) =>
    Effect.gen(function* () {
      const client = yield* Capability.get(ClientCapabilities.Client);
      const space = client.spaces.get(spaceId);
      if (!space) {
        return yield* Effect.fail(new Error(`Space not found: ${spaceId}`));
      }
      yield* SampleSpace.applyTo(StockfishSpace(), space);

      const project = yield* findObject(Project.Project, (candidate) => candidate.name === PROJECT_NAME);
      if (!project?.taskSet || !project.instructions) {
        return yield* Effect.fail(new Error('The template did not produce the project.'));
      }
      const taskSet = yield* Database.load(project.taskSet);
      const tasks = yield* Effect.forEach(taskSet.tasks, (ref) => Database.load(ref));
      const stages = DELEGATED_STAGES.map((title) => tasks.find((task) => task.title === title)).filter(
        (stage): stage is Task.Task => stage !== undefined,
      );
      if (stages.length !== DELEGATED_STAGES.length) {
        return yield* Effect.fail(new Error('The template did not produce the delegated stages.'));
      }

      // The space's Development skill, which the project's instructions bind for a companion chat.
      // Delegation does not bind a project's instructions yet, so the run does it here: without it
      // the session has the brief but not how this space wants the work done.
      const projectInstructions = yield* Database.load(project.instructions);
      for (const ref of projectInstructions.skills) {
        const skill = yield* Database.load(ref);
        Obj.update(instructions, (instructions) => {
          instructions.skills.push(Ref.make(skill));
        });
      }

      // What delegation does to the chat and the tasks, minus opening the deck.
      const feed = yield* Database.add(Feed.make());
      const chat = yield* Database.add(Chat.make({ name: PROJECT_NAME, feed: Ref.make(feed) }));
      Obj.update(chat, (chat) => {
        chat.tasks.push(...stages.map((stage) => Ref.make(stage)));
      });
      Chat.linkCompanion({ chat, subject: project });
      for (const stage of stages) {
        Task.setStatus(stage, 'started', { actor: REVIEWER });
        Obj.update(stage, (stage) => {
          stage.assignee = { role: 'assistant' };
          stage.reviewers = [REVIEWER];
        });
      }
      yield* Database.flush();

      return { objects: [Ref.make(project)], chat: Ref.make(chat) };
    }),
  scorers: SCORERS,
});

/**
 * The models a delegated coding session is measured on. DeepSeek V4 Pro is what the template tells
 * its reader to select, and it is served through EDGE with the run's own identity, so it needs no
 * key; Opus goes to Anthropic directly and needs `DX_ANTHROPIC_API_KEY`.
 */
const MODELS = [Model.claudeOpus5, Model.deepseekV4Pro].map((model) => ({
  name: model.backend,
  input: { model: model.id },
}));

/**
 * `DX_EVAL_MODELS` names the variants to run, comma-separated, for a run that wants one model's
 * hour rather than every model's at once. Unset or empty runs them all: a workflow input that was
 * left blank still sets the variable.
 */
const selected = process.env.DX_EVAL_MODELS?.trim()
  ? process.env.DX_EVAL_MODELS.split(',').map((name) => name.trim())
  : undefined;
const VARIANTS = selected ? MODELS.filter(({ name }) => selected.includes(name)) : MODELS;

evalite.each(VARIANTS)('Chess MCP — a delegated session designs, deploys and serves a chess engine over MCP', {
  data: [{ input: null }],
  task,
  scorers: Scorer.toEvalite(SCORERS),
});
