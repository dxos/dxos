//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import type * as Stream from 'effect/Stream';

import { type Database, Obj } from '@dxos/echo';
import { type Fact } from '@dxos/echo-memory';
import { Pipeline, Stage } from '@dxos/pipeline';
import { Message, Task, TaskSet } from '@dxos/types';

import { Contract, type EntityExtractor, type Researcher, type Responder } from '../contracts/index.ts';
import { type RecordedFact } from '../generators/corpus.ts';
import { type FactSource, actionable, extractFacts, mentionFact, sentenceOf } from '../processors/facts.ts';
import { Support } from '../types/index.ts';

/** Foreign-key source naming the message a task was created from. */
export const MESSAGE_KEY_SOURCE = 'org.dxos.stories.support.message';

/** One message handed to the pipeline. */
export type Input = {
  /** Stable key the message's fact ids derive from. */
  readonly key: string;
  readonly message: Message.Message;
  /** A recorded extraction of the message's facts; without one the sentence rule reads the text. */
  readonly recorded?: readonly RecordedFact[];
};

/** The processors the plugins provide, resolved by contract. */
export type Processors = {
  readonly entities: EntityExtractor.Implementation;
  readonly researcher: Researcher.Implementation;
  readonly responder: Responder.Implementation;
};

export type Options = {
  readonly db: Database.Database;
  /** URI of the mailbox the messages arrived in; drafts are filed against it. */
  readonly mailbox: string;
  /** The set tasks for people are filed in. */
  readonly taskSet: TaskSet.TaskSet;
  readonly processors: Processors;
  /** Stores facts in the space's memory. */
  readonly putFacts: (facts: readonly Fact.Fact[]) => Effect.Effect<void, unknown>;
  /** Called as each stage of each message starts and ends. */
  readonly onStage?: (message: string, stage: Support.StageRun) => void;
  /** Time each stage waits before it runs, so a viewer can see the working row. */
  readonly stageDelay?: Duration.Input;
};

/** What happened to one question or request. */
export type Outcome = {
  readonly fact: Fact.Fact;
  readonly decision: Support.Decision;
  /** URI of the draft or task made for it. */
  readonly object?: string;
};

/** A message and everything the stages before have found. */
export type Envelope = {
  readonly input: Input;
  readonly source: FactSource;
  readonly subject: string;
  /** Stages that failed for this message. */
  readonly failed: readonly Support.StageId[];
  readonly facts: readonly Fact.Fact[];
  /** Evidence for each question, by fact id. */
  readonly evidence: ReadonlyMap<string, readonly Support.Evidence[]>;
  readonly outcomes: readonly Outcome[];
};

type StageResult = {
  readonly envelope: Envelope;
  readonly detail?: string;
  /** Why the stage failed although it has an envelope to pass on; the stage is then reported as failed. */
  readonly failure?: string;
};

const count = (value: number, noun: string): string => `${value} ${noun}${value === 1 ? '' : 's'}`;

const describe = (cause: unknown): string => (cause instanceof Error ? cause.message : String(cause));

const TASK_REASON: Record<Support.TaskReason, string> = {
  'request': 'A request needs a person to act.',
  'no-evidence': 'No canonical document covers the topic.',
  'low-confidence': 'No passage answers the question with enough confidence.',
  'research-failed': 'Research failed before an answer could be drafted.',
  'respond-failed': 'The reply could not be drafted.',
};

/**
 * The six stages as one stream transform. A stage that fails marks its row failed and passes the message on, so one
 * bad message never stops the stream.
 */
export const stages =
  ({ db, mailbox, taskSet, processors, putFacts, onStage, stageDelay }: Options) =>
  <E, R>(source: Stream.Stream<Input, E, R>): Stream.Stream<Envelope, E, R> => {
    const report = (envelope: Envelope, stage: Support.StageRun) => onStage?.(envelope.input.message.id, stage);

    const stage = (
      id: Support.StageId,
      run: (envelope: Envelope) => Effect.Effect<StageResult, unknown>,
      { skip }: { skip?: (envelope: Envelope) => boolean } = {},
    ): Stage.Stage<Envelope, Envelope> =>
      Stage.map(id, (envelope: Envelope) =>
        Effect.gen(function* () {
          if (skip?.(envelope)) {
            return envelope;
          }
          report(envelope, { id, status: 'working' });
          if (stageDelay !== undefined) {
            yield* Effect.sleep(stageDelay);
          }
          return yield* run(envelope).pipe(
            Effect.map((result) => {
              if (result.failure !== undefined) {
                report(envelope, { id, status: 'failed', detail: result.failure });
                return { ...result.envelope, failed: [...result.envelope.failed, id] };
              }
              report(envelope, { id, status: 'success', detail: result.detail });
              return result.envelope;
            }),
            Effect.catch((cause) =>
              Effect.sync(() => {
                report(envelope, { id, status: 'failed', detail: describe(cause) });
                return { ...envelope, failed: [...envelope.failed, id] };
              }),
            ),
          );
        }),
      );

    const ingest = Stage.map('ingest', (input: Input) =>
      Effect.sync((): Envelope => {
        const { message } = input;
        const text = Message.extractText(message);
        const envelope: Envelope = {
          input,
          source: {
            key: input.key,
            text,
            source: Obj.getURI(message),
            created: message.created,
            sender: { email: message.sender.email ?? '', name: message.sender.name },
          },
          subject: typeof message.properties?.subject === 'string' ? message.properties.subject : text.slice(0, 60),
          failed: [],
          facts: [],
          evidence: new Map(),
          outcomes: [],
        };
        report(envelope, { id: 'ingest', status: 'success', detail: count(text.split(/\s+/).length, 'word') });
        return envelope;
      }),
    );

    const entities = stage('entities', (envelope) =>
      Effect.gen(function* () {
        const { sender } = envelope.source;
        if (!sender.email) {
          return yield* Effect.fail(new Contract.ProcessorError({ message: 'The message has no sender address.' }));
        }
        const { created, matched } = yield* processors.entities.extract({ sender });
        const detail = [
          created.length > 0 ? `${created.length} created` : undefined,
          matched.length > 0 ? `${matched.length} matched` : undefined,
        ]
          .filter((part) => part !== undefined)
          .join(', ');
        return { envelope, detail };
      }),
    );

    const facts = stage('facts', (envelope) =>
      Effect.gen(function* () {
        const found = extractFacts(envelope.source, envelope.input.recorded);
        // A failed write still passes the facts on: triage must make a task for every request it was asked.
        const failure = yield* putFacts(found).pipe(Effect.match({ onSuccess: () => undefined, onFailure: describe }));
        const kinds = found.map(Support.kindOf);
        const detail = Support.FactKind.literals
          .map((kind) => [kind, kinds.filter((value) => value === kind).length] as const)
          .filter(([, total]) => total > 0)
          .map(([kind, total]) => count(total, kind))
          .join(', ');
        return { envelope: { ...envelope, facts: found }, detail, failure };
      }),
    );

    const research = stage('research', (envelope) =>
      Effect.gen(function* () {
        const questions = envelope.facts.filter((fact) => Support.kindOf(fact) === 'question');
        const evidence = new Map<string, readonly Support.Evidence[]>();
        const topics = new Set<string>();
        for (const fact of questions) {
          const found = yield* processors.researcher.research({
            question: sentenceOf(fact),
            context: envelope.source.text,
          });
          evidence.set(fact.id, found.evidence);
          found.topics.forEach((topic) => topics.add(topic));
        }
        if (topics.size > 0) {
          yield* putFacts([...topics].map((topic) => mentionFact(envelope.source, topic)));
        }
        const passages = [...evidence.values()].reduce((total, found) => total + found.length, 0);
        const detail =
          questions.length === 0
            ? 'no questions'
            : `${count(passages, 'passage')}${topics.size > 0 ? ` (${[...topics].join(', ')})` : ''}`;
        return { envelope: { ...envelope, evidence }, detail };
      }),
    );

    const respond = stage(
      'respond',
      (envelope) =>
        Effect.gen(function* () {
          const { message } = envelope.input;
          const outcomes: Outcome[] = [];
          for (const fact of envelope.facts.filter((fact) => Support.kindOf(fact) === 'question')) {
            const { decision, draft } = yield* processors.responder.respond({
              mailbox,
              message: {
                id: message.id,
                subject: envelope.subject,
                created: message.created,
                threadId: message.threadId,
                sender: envelope.source.sender,
              },
              question: sentenceOf(fact),
              evidence: envelope.evidence.get(fact.id) ?? [],
            });
            outcomes.push({ fact, decision, object: draft });
          }
          const drafts = outcomes.filter((outcome) => outcome.decision.kind === 'draft').length;
          return {
            envelope: { ...envelope, outcomes },
            detail: outcomes.length === 0 ? 'no questions' : count(drafts, 'draft'),
          };
        }),
      // Without research there is no evidence to answer from; the questions go to triage.
      { skip: (envelope) => envelope.failed.includes('research') },
    );

    const triage = stage('triage', (envelope) =>
      Effect.sync(() => {
        const { message } = envelope.input;
        const { sender } = envelope.source;
        const decided = new Map(envelope.outcomes.map((outcome) => [outcome.fact.id, outcome]));
        const outcomes = actionable(envelope.facts).map((fact): Outcome => {
          const known = decided.get(fact.id);
          if (known?.decision.kind === 'draft') {
            return known;
          }
          const decision: Support.TaskDecision =
            known?.decision.kind === 'task'
              ? known.decision
              : {
                  kind: 'task',
                  confidence: 0,
                  reason:
                    Support.kindOf(fact) === 'request'
                      ? 'request'
                      : envelope.failed.includes('research')
                        ? 'research-failed'
                        : 'respond-failed',
                };
          const task = Task.make({
            title: sentenceOf(fact),
            description: [
              TASK_REASON[decision.reason],
              `From ${sender.name ?? sender.email} <${sender.email}>: "${envelope.subject}"`,
            ].join('\n\n'),
            status: 'todo',
            priority: decision.reason === 'request' ? 'medium' : 'high',
          });
          Obj.update(task, (task) => Obj.getMeta(task).keys.push({ source: MESSAGE_KEY_SOURCE, id: message.id }));
          db.add(task);
          TaskSet.addTaskToSet(taskSet, task);
          return { fact, decision, object: Obj.getURI(task) };
        });
        const tasks = outcomes.filter((outcome) => outcome.decision.kind === 'task').length;
        return {
          envelope: { ...envelope, outcomes },
          detail: tasks === 0 ? 'nothing for a person' : count(tasks, 'task'),
        };
      }),
    );

    return source.pipe(ingest, entities, facts, research, respond, triage);
  };

/** Runs the pipeline over a stream of messages until the stream ends; `onDone` receives each finished message. */
export const run = <E, R>(
  source: Stream.Stream<Input, E, R>,
  options: Options,
  onDone: (envelope: Envelope) => void = () => {},
): Effect.Effect<void, E, R> =>
  source.pipe(stages(options), Pipeline.run({ sink: (envelope) => Effect.sync(() => onDone(envelope)) }));
