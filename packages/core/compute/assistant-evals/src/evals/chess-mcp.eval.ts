//
// Copyright 2026 DXOS.org
//

import { Chess } from 'chess.js';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import * as Capability from '@dxos/app-framework/Capability';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { McpServer, PlanningSkill } from '@dxos/assistant-toolkit';
import * as Chat from '@dxos/assistant/Chat';
import { Config } from '@dxos/client';
import { EDGE_URLS } from '@dxos/config';
import * as Operation from '@dxos/compute/Operation';
import * as Project from '@dxos/compute/Project';
import { Collection, Database, Feed, Obj, Ref } from '@dxos/echo';
import { DXN, type SpaceId } from '@dxos/keys';
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
import { type Actor, Task } from '@dxos/types';
import { trim } from '@dxos/util';

import { findObject, toolInvocations } from '../assertions';
import { createEvalRunner } from '../runner';
import { getDefaultSkills } from '../skills';
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
  const tokens = answer.match(/\b(?:[a-h][1-8][a-h][1-8][qrbn]?|O-O(?:-O)?|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)\b/g) ?? [];
  return tokens.some((token) => {
    const game = new Chess(SEEDED_FEN);
    try {
      return game.move(token) !== null;
    } catch {
      return false;
    }
  });
};

/** A score somewhere in the evaluation's text: centipawns, pawns, or a mate count. */
const namesAScore = (answer: string | undefined): boolean =>
  !!answer && /-?\d+(?:\.\d+)?|mate/i.test(answer) && !/error/i.test(answer.slice(0, 40));

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
  dbQuery: (_input: unknown, spaceId: SpaceId) =>
    Effect.gen(function* () {
      const invocations = yield* toolInvocations();
      const execName = Operation.toolName(SandboxOperation.Exec);
      // Where the hour went: each call with when it started (seconds into the run), how long the
      // tool took, and the wait before it (the model's turn). Inputs and results are excerpts.
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
      const trace = {
        sandboxCreated: invocations.some(({ name }) => name === Operation.toolName(SandboxOperation.CreateSandbox)),
        execCalls: invocations.filter(({ name }) => name === execName).length,
        erroredTools: invocations.filter(({ error }) => error).map(({ name }) => name),
        toolSeconds: Math.round(sum(timeline.map(({ tookMs }) => tookMs)) / 1_000),
        modelSeconds: Math.round(sum(timeline.map(({ waitMs }) => waitMs)) / 1_000),
        timeline,
      };
      const empty = {
        ...trace,
        designFiled: false,
        designDiagrammed: false,
        workerUrls: [] as string[],
        claimUrlFiled: false,
        probe: undefined as Probe | undefined,
        sandboxId: undefined as string | undefined,
        toolsListed: 0,
        bestMoveLegal: false,
        evaluationScored: false,
        delegatedInReview: 0,
        delegatedTotal: DELEGATED_STAGES.length,
        readerStepsUntouched: false,
        laterStagesUntouched: false,
      };

      const project = yield* findObject(Project.Project, (candidate) => candidate.name === PROJECT_NAME);
      const taskSet = project?.taskSet ? yield* Database.load(project.taskSet) : undefined;
      if (!project || !taskSet) {
        return empty;
      }

      // Everything the session filed on the project, read as text.
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
      const design = texts.find(({ name, content }) => /design/i.test(name) || /^#.*design/im.test(content));
      const workerUrls = [...new Set((filed.match(WORKER_URL) ?? []).map((url) => url.replace(/[.,)]+$/, '')))];

      // The handshake, from the sandbox the session built in: the last one it opened is the one
      // that deployed. Candidates are every Worker URL it filed, bare host first, then with the
      // paths it mentioned and the conventional `/mcp`.
      let probe: Probe | undefined;
      const sandbox = yield* findObject(Sandbox.Sandbox, () => true);
      // Named in the output so the container, which outlives the run, can be inspected afterwards.
      const sandboxId = sandbox?.id;
      if (workerUrls.length > 0 && sandbox) {
        const hosts = [...new Set(workerUrls.map((url) => new URL(url).origin))];
        const candidates = [...new Set([...workerUrls, ...hosts.map((host) => `${host}/mcp`), ...hosts])];
        const command = `cat > /tmp/mcp-probe.mjs <<'PROBE'\n${MCP_PROBE}\nPROBE\nnode /tmp/mcp-probe.mjs '${SEEDED_FEN}' ${candidates.map((url) => `'${url}'`).join(' ')}`;
        const result = yield* Operation.invoke(
          SandboxOperation.Exec,
          { sandbox: Ref.make(sandbox), command, timeout: 3 * 60 * 1_000 },
          { spaceId },
        ).pipe(Effect.orElseSucceed(() => undefined));
        probe = result ? parseProbe(result.stdout) : undefined;
      }

      const tasks = yield* Effect.forEach(taskSet.tasks, (ref) =>
        Database.load(ref).pipe(Effect.orElseSucceed(() => undefined)),
      );
      const byTitle = (title: string) => tasks.find((candidate) => candidate?.title === title);
      const delegated = DELEGATED_STAGES.map(byTitle);
      const readerSteps = tasks.filter((candidate) => candidate?.assignee?.role === 'user');
      const later = tasks.filter(
        (candidate) =>
          candidate?.parentTask !== undefined &&
          candidate.assignee?.role !== 'assistant' &&
          candidate.assignee?.role !== 'user' &&
          !DELEGATED_STAGES.includes(candidate.title ?? '') &&
          !delegated.some((stage) => stage && Task.refEntityId(candidate.parentTask!) === stage.id),
      );

      return {
        ...trace,
        sandboxId,
        designFiled: !!design && design.content.length > 200,
        designDiagrammed: !!design && /```mermaid/.test(design.content),
        workerUrls,
        // The claim URL is a bearer credential for the account; the skill says to file it nowhere.
        claimUrlFiled: CLAIM_URL.test(filed),
        probe,
        toolsListed: probe?.tools.length ?? 0,
        bestMoveLegal: namesLegalMove(probe?.bestMove),
        evaluationScored: namesAScore(probe?.evaluation),
        // `done` past a named reviewer lands as `review`; either means the session finished the stage.
        delegatedInReview: delegated.filter(
          (candidate) => candidate?.status === 'review' || candidate?.status === 'done',
        ).length,
        delegatedTotal: delegated.filter(Boolean).length,
        // The model choice, the claim and the GitHub steps are the reader's, and cannot be done here.
        readerStepsUntouched: readerSteps.length > 0 && readerSteps.every((step) => step?.status === 'todo'),
        // The steps of stages four and five, and the stages themselves, were not delegated.
        laterStagesUntouched: later.length > 0 && later.every((step) => step?.status === 'todo'),
      };
    }),
});

/**
 * The models a delegated coding session is measured on. DeepSeek V4 Pro is what the template tells
 * its reader to select, and it is served through EDGE with the run's own identity, so it needs no
 * key; Opus goes to Anthropic directly and needs `DX_ANTHROPIC_API_KEY`.
 */
const MODELS = [
  { name: 'claude-opus-5', input: { model: DXN.make('com.anthropic.model.claude-opus-5.default') } },
  { name: 'deepseek-v4-pro', input: { model: DXN.make('com.deepseek.model.deepseek-v4-pro.default') } },
];

/**
 * `DX_EVAL_MODELS` names the variants to run, comma-separated, for a run that wants one model's
 * hour rather than every model's at once. Unset runs them all.
 */
const selected = process.env.DX_EVAL_MODELS?.split(',').map((name) => name.trim());
const VARIANTS = selected ? MODELS.filter(({ name }) => selected.includes(name)) : MODELS;

evalite.each(VARIANTS)('Chess MCP — a delegated session designs, deploys and serves a chess engine over MCP', {
  data: [{ input: null }],
  task,
  scorers: [
    {
      name: 'design-filed-with-diagram',
      description: 'A design artifact is on the project and carries a mermaid diagram of the request path.',
      scorer: ({ output }) =>
        [output.dbQuery.designFiled, output.dbQuery.designDiagrammed].filter(Boolean).length / 2,
    },
    {
      name: 'shell-was-used',
      description: 'The session opened a sandbox and ran commands in it.',
      scorer: ({ output }) => (output.dbQuery.sandboxCreated && output.dbQuery.execCalls > 0 ? 1 : 0),
    },
    {
      name: 'worker-url-filed-claim-url-not',
      description: 'A project artifact carries the Worker URL, and none carries the claim URL.',
      scorer: ({ output }) => (output.dbQuery.workerUrls.length > 0 && !output.dbQuery.claimUrlFiled ? 1 : 0),
    },
    {
      name: 'mcp-handshake-lists-two-tools',
      description: 'The filed URL answers initialize and tools/list over Streamable HTTP with two tools.',
      scorer: ({ output }) => (output.dbQuery.toolsListed >= 2 ? 1 : output.dbQuery.toolsListed > 0 ? 0.5 : 0),
    },
    {
      name: 'best-move-is-legal',
      description: 'The move tool, called with the seeded position, names a move that is legal in it.',
      scorer: ({ output }) => (output.dbQuery.bestMoveLegal ? 1 : 0),
    },
    {
      name: 'evaluation-returns-a-score',
      description: 'The evaluate tool, called with the seeded position, returns a score.',
      scorer: ({ output }) => (output.dbQuery.evaluationScored ? 1 : 0),
    },
    {
      name: 'delegated-stages-in-review',
      description: 'Every stage the session was given is in review (or done) when it finishes.',
      scorer: ({ output }) =>
        output.dbQuery.delegatedTotal > 0 ? output.dbQuery.delegatedInReview / output.dbQuery.delegatedTotal : 0,
    },
    {
      name: 'reader-and-later-work-left-alone',
      description: "The reader's steps and the two undelegated stages are still to do.",
      scorer: ({ output }) =>
        [output.dbQuery.readerStepsUntouched, output.dbQuery.laterStagesUntouched].filter(Boolean).length / 2,
    },
    {
      name: 'no-tool-errors',
      description: 'No tool call errored during the session.',
      scorer: ({ output }) => (output.dbQuery.erroredTools.length === 0 ? 1 : 0),
    },
  ],
});
