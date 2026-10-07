//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from 'effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { AiService } from '@dxos/ai';
import * as CompilePrompt from '@dxos/brain/CompilePrompt';
import * as Compiler from '@dxos/brain/Compiler';
import * as Oracle from '@dxos/brain/Oracle';

/** Goals compile with a Sonnet-class model: smaller models wrote invalid or unsafe rules in the M1 spike (BRAIN.md). */
export const COMPILE_MODEL = 'com.anthropic.model.claude-sonnet-5.default';

/** Compile attempts before giving up; each retry is told what the previous one got wrong. */
const ATTEMPTS = 2;

/**
 * Longest a compilation may take before the caller keeps its own rules: it runs inside the operation that
 * sets a watch, which EDGE cuts off at 60 s.
 */
export const COMPILE_BUDGET = '40 seconds';

export type CompileGoalProps = {
  goal: string;
  instructions?: string;
  /** The owner's entity id (their identity DID). */
  owner: string;
  /** People the goal may name, with the ids facts use for them. */
  people: readonly Oracle.Person[];
  /** When the goal begins (ISO). */
  now: string;
};

export type CompiledGoal = {
  readonly rules: string;
  readonly reply: CompilePrompt.Reply;
};

/**
 * Compiles a goal's text into rules with the model (`CompilePrompt`), checks them (`Compiler`), and lets
 * them through only if they replay a timeline an independent oracle wrote from the text alone
 * (`Oracle`). `undefined` when no attempt passes, so the caller keeps its own rules.
 */
export const compileGoal = (
  props: CompileGoalProps,
): Effect.Effect<CompiledGoal | undefined, never, AiService.AiService> =>
  Effect.gen(function* () {
    const people =
      props.people.length > 0
        ? `People: refer to them in rules by these ids, as quoted strings: ${props.people
            .map(({ name, id }) => `${name} = ${JSON.stringify(id)}`)
            .join('; ')}. A fact's speaker and a person as subject or object use the same id.`
        : undefined;
    const user = [
      CompilePrompt.userMessage({
        goal: props.goal,
        instructions: props.instructions,
        owner: props.owner,
        now: props.now,
      }),
      people,
    ]
      .filter((line) => line !== undefined)
      .join('\n');

    const compile = (feedback?: string) =>
      LanguageModel.generateText({
        prompt: `${CompilePrompt.SYSTEM_PROMPT}\n\n${user}${feedback ? `\n\nYour previous rules were wrong:\n${feedback}` : ''}`,
      }).pipe(Effect.map(({ text }) => text));
    // The oracle never sees the rules, so it runs alongside the first compilation.
    const [timeline, first] = yield* Effect.all(
      [
        LanguageModel.generateText({
          prompt: `${Oracle.SYSTEM_PROMPT}\n\n${Oracle.userMessage({ ...props, people: props.people })}`,
        }).pipe(Effect.map(({ text }) => Oracle.parseReply(text).steps)),
        compile(),
      ],
      { concurrency: 2 },
    );

    let feedback: string | undefined;
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      const text = attempt === 0 ? first : yield* compile(feedback);
      const reply = yield* Effect.try(() => CompilePrompt.parseReply(text)).pipe(Effect.option);
      if (reply._tag === 'None') {
        feedback = 'The reply did not follow the output format.';
        continue;
      }
      const { diagnostics } = Compiler.compile(reply.value.datalog);
      if (diagnostics.length > 0) {
        feedback = diagnostics.map(Compiler.formatDiagnostic).join('\n');
        continue;
      }
      const result = Oracle.replay(reply.value.datalog, { createdAt: Date.parse(props.now), steps: timeline });
      if (result.ok) {
        return { rules: reply.value.datalog, reply: reply.value };
      }
      feedback = result.failures.join('\n');
    }
    yield* Effect.logInfo('goal not compiled', { goal: props.goal, feedback });
    return undefined;
  }).pipe(
    Effect.timeoutOption(COMPILE_BUDGET),
    Effect.map(Option.getOrUndefined),
    // Without extended thinking a compile answers in about 9 s rather than 37 s, which is what lets the oracle,
    // a compile and one retry fit the budget; the replay gate, not the model's deliberation, checks the rules.
    Effect.provide(AiService.languageModel(COMPILE_MODEL, { thinking: false }).pipe(Layer.orDie)),
    Effect.catchCause((cause) =>
      Effect.logInfo('goal compilation failed', { goal: props.goal, cause }).pipe(Effect.as(undefined)),
    ),
  );
