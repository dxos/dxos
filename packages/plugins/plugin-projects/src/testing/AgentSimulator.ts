//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Duration from 'effect/Duration';

import { ScriptedLanguageModel } from '@dxos/ai/testing';
import { PlanningOperations } from '@dxos/assistant-toolkit';
import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';
import { Task } from '@dxos/types';

//
// A simulated agent for delegated project work: a `ScriptedLanguageModel` turn generator that reads
// the live task graph on every model call and answers with the next tool call a real agent would
// make. The session, its tools, the task writes, the trace events and the UI are all real — only
// the model is replaced — so delegation runs end to end offline, at a pace chosen for a demo.
//
// The next turn is derived from the tasks' current state rather than from a fixed list, so the
// script stays correct whatever order the session's calls interleave in, and a variant is just a
// different {@link Strategy} over the same state.
//

const { text, toolCall, promptIncludes } = ScriptedLanguageModel;

/** How long the simulated agent takes, per turn. */
export type Pace = {
  /** Held before a turn that starts work. */
  readonly think: Duration.Input;
  /** Held before a turn that finishes work — the time a task spends `started`. */
  readonly work: Duration.Input;
};

export const DEFAULT_PACE: Pace = { think: '2 seconds', work: '10 seconds' };

/** What a strategy decides from: the task handed to the agent and the work under it, in order. */
export type AgentState = {
  readonly root: Task.Task;
  readonly subtasks: readonly Task.Task[];
  readonly pace: Pace;
};

/** Chooses the next model turn from the current state of the delegated work. */
export type Strategy = (state: AgentState) => ScriptedLanguageModel.ScriptedTurn;

export type AgentSimulatorOptions = {
  /** The task handed to the agent; read on every call, since it only exists once the story seeds it. */
  readonly root: () => Task.Task | undefined;
  readonly strategy?: Strategy;
  readonly pace?: Partial<Pace>;
};

// Requests from the harness around the agent, not the agent's own turns: answered in one line so a
// strategy only ever sees the work.
const CHAT_NAME_PROMPT = 'Suggest a name for this chat';
const PLAN_REMINDER_PROMPT = 'Reply with exactly one word';

/** A task a reviewer holds counts as finished: the agent's part of it is over. */
export const isFinished = (task: Task.Task): boolean => task.status === 'done' || task.status === 'review';

const updateTasks = (changes: readonly { task: Task.Task; status: 'started' | 'done' }[]) =>
  toolCall(Operation.toolName(PlanningOperations.UpdateTasks), {
    // A bare URI: a ref parameter reaches a tool as the string the model is shown.
    changes: changes.map(({ task, status }) => ({ task: Obj.getURI(task).toString(), status })),
  });

const list = (tasks: readonly Task.Task[]): string => tasks.map((task) => `"${task.title}"`).join(', ');

/** Starts `tasks` in one turn. */
export const startTurn = (tasks: readonly Task.Task[], pace: Pace): ScriptedLanguageModel.ScriptedTurn => ({
  delay: pace.think,
  parts: [text(`Starting ${list(tasks)}.`), updateTasks(tasks.map((task) => ({ task, status: 'started' as const })))],
});

/** Finishes `tasks` in one turn, after the time they took. */
export const finishTurn = (tasks: readonly Task.Task[], pace: Pace): ScriptedLanguageModel.ScriptedTurn => ({
  delay: pace.work,
  parts: [text(`Finished ${list(tasks)}.`), updateTasks(tasks.map((task) => ({ task, status: 'done' as const })))],
});

/** Closes the delegated task once its sub-tasks are finished, else ends the session. */
const closeTurn = ({ root, pace }: AgentState): ScriptedLanguageModel.ScriptedTurn =>
  isFinished(root)
    ? { parts: [text(`All work on "${root.title}" is complete and ready for review.`)] }
    : {
        delay: pace.think,
        parts: [text(`Every sub-task is finished.`), updateTasks([{ task: root, status: 'done' }])],
      };

/** One sub-task at a time, in order: start it, work, finish it, then the next. */
export const sequential: Strategy = (state) => {
  const next = state.subtasks.find((task) => !isFinished(task));
  if (!next) {
    return closeTurn(state);
  }
  return next.status === 'started' ? finishTurn([next], state.pace) : startTurn([next], state.pace);
};

/** Every sub-task started at once, then finished one per turn, in order. */
export const concurrent: Strategy = (state) => {
  const pending = state.subtasks.filter((task) => !isFinished(task) && task.status !== 'started');
  if (pending.length > 0) {
    return startTurn(pending, state.pace);
  }
  const next = state.subtasks.find((task) => !isFinished(task));
  return next ? finishTurn([next], state.pace) : closeTurn(state);
};

/** A question the agent puts to the user part-way through a sub-task. */
export type Question = {
  /** Title of the sub-task the question blocks. */
  readonly task: string;
  readonly question: string;
  readonly context?: string;
  readonly options: readonly string[];
};

/**
 * Wraps `strategy` so that, once the sub-task titled `question.task` is under way, the agent asks
 * `question` and ends its turn, as the ask-question tool instructs; answered, it resumes that sub-task
 * and hands back to `strategy`. The answer arrives as a new turn, so nothing here waits.
 */
export const withQuestion =
  (strategy: Strategy, question: Question): Strategy =>
  (state) => {
    const task = state.subtasks.find((candidate) => candidate.title === question.task);
    const [thread] = task ? Task.getQuestions(task.history) : [];
    if (task && !thread && task.status === 'started') {
      return {
        delay: state.pace.think,
        parts: [
          text(`I need a decision before I can finish "${task.title}".`),
          toolCall(Operation.toolName(PlanningOperations.AskQuestion), {
            task: task.title,
            question: question.question,
            ...(question.context ? { context: question.context } : {}),
            options: question.options.map((title) => ({ title })),
          }),
        ],
      };
    }
    if (task && thread && !thread.answer) {
      return { parts: [text(`Waiting for an answer to "${question.question}".`)] };
    }
    if (task && thread?.answer && task.status === 'blocked') {
      return {
        delay: state.pace.think,
        parts: [
          text(`Answered "${thread.answer.answer}"; resuming "${task.title}".`),
          updateTasks([{ task, status: 'started' }]),
        ],
      };
    }
    return strategy(state);
  };

/** The root's direct sub-tasks, dropping unresolved refs. */
const resolveSubtasks = (root: Task.Task): Task.Task[] =>
  (root.subtasks ?? []).flatMap((ref) => (ref.target ? [ref.target] : []));

/**
 * The turn generator to hand to `ScriptedLanguageModel.scriptedAiServiceMiddleware`.
 */
export const make = ({
  root,
  strategy = sequential,
  pace,
}: AgentSimulatorOptions): ScriptedLanguageModel.ScriptedTurnGenerator => {
  const resolvedPace: Pace = { ...DEFAULT_PACE, ...pace };
  return (request) => {
    if (promptIncludes(CHAT_NAME_PROMPT)(request)) {
      return { parts: [text('Agent simulation')] };
    }
    if (promptIncludes(PLAN_REMINDER_PROMPT)(request)) {
      return { parts: [text('stop')] };
    }
    const task = root();
    if (!task) {
      return { parts: [text('No task has been assigned.')] };
    }
    return strategy({ root: task, subtasks: resolveSubtasks(task), pace: resolvedPace });
  };
};
