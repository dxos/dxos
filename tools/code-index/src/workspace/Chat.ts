//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Stream from 'effect/Stream';
import { createInterface } from 'node:readline/promises';

import * as Agent from './Agent.ts';
import type * as Events from './Events.ts';
import * as Log from './Log.ts';

/**
 * The terminal chat. Same log, same agent, same sandbox as the webui — it just renders the event
 * stream as lines instead of panels, which makes it the cheapest way to exercise a turn end to
 * end without a browser.
 */

const RESET = '[0m';
const DIM = '[2m';
const BOLD = '[1m';
const CYAN = '[36m';
const YELLOW = '[33m';
const RED = '[31m';

/** One line per event, in the order the agent produced them. */
export const render = (event: Events.Event): string | undefined => {
  switch (event._tag) {
    case 'UserMessage':
      return `${BOLD}› ${event.text}${RESET}`;
    case 'AssistantMessage':
      return `${event.text}`;
    case 'ToolCall':
      return `${DIM}exec ›${RESET}\n${DIM}${event.code.trim()}${RESET}`;
    case 'ToolResult':
      return `${event.ok ? DIM : RED}${event.output.trim() || '(no output)'}${RESET}`;
    case 'Presented':
      // The point of the CLI is to see whether the agent actually displayed something, so a
      // presentation is printed in full rather than summarised.
      return [
        `${CYAN}┌─ ${event.kind}${event.title ? `: ${event.title}` : ''}${RESET}`,
        ...event.content.split('\n').map((line) => `${CYAN}│${RESET} ${line}`),
        `${CYAN}└─${RESET}`,
      ].join('\n');
    case 'CanvasCleared':
      return `${DIM}(canvas cleared)${RESET}`;
    case 'TurnFailed':
      return `${RED}⚠ ${event.message}${RESET}`;
    case 'TitleSet':
      return undefined;
  }
};

export type Options = {
  readonly projectId: string;
  /** A single turn to run, then exit — how a test or a script drives the agent. */
  readonly prompt?: string;
};

/**
 * Runs the chat. The printer tails the log rather than watching the agent, so what the terminal
 * shows is exactly what a reload of the webui would replay.
 */
export const run = ({ projectId, prompt }: Options): Effect.Effect<void, unknown, Log.Log | Agent.Agent> =>
  Effect.gen(function* () {
    const log = yield* Log.Log;
    const agent = yield* Agent.Agent;

    // A one-shot run prints only what this turn produces; an interactive session replays the whole
    // project first, so resuming looks the same as it does in the browser.
    const history = yield* log.read(projectId);
    const from = prompt === undefined ? 0 : (history.at(-1)?.seq ?? 0);

    const printer = yield* log.stream(projectId, from).pipe(
      Stream.runForEach((entry) => {
        const line = render(entry.event);
        return line === undefined ? Effect.void : Console.log(line);
      }),
      Effect.forkScoped,
    );

    if (prompt !== undefined) {
      yield* agent.turn({ projectId, text: prompt });
      // The printer is a separate fiber reading a queue; give it the tail of the log before the
      // scope closes under it.
      yield* Effect.yieldNow;
      yield* Effect.sleep('100 millis');
      return yield* Fiber.interrupt(printer);
    }

    yield* Console.log(`${DIM}code-index chat · project ${projectId} · ^C to exit${RESET}`);
    const readline = createInterface({ input: process.stdin, output: process.stdout });
    yield* Effect.addFinalizer(() => Effect.sync(() => readline.close()));

    // The loop is a plain recursion over one blocking read: a terminal has no backpressure to
    // model and this keeps ^C handling with the runtime rather than in a signal handler.
    const next: Effect.Effect<void, unknown> = Effect.gen(function* () {
      const line = yield* Effect.promise(() => readline.question(`${YELLOW}› ${RESET}`));
      const text = line.trim();
      if (text.length === 0) {
        return yield* next;
      }
      if (text === '/exit' || text === '/quit') {
        return;
      }
      yield* agent
        .turn({ projectId, text })
        .pipe(Effect.catch((error) => Console.error(`${RED}${error.message}${RESET}`)));
      return yield* next;
    });

    yield* next;
    yield* Fiber.interrupt(printer);
  }).pipe(Effect.scoped);
