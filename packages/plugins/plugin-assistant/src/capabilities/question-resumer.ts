//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import * as TaskOperation from '@dxos/plugin-tasks/TaskOperation';
import { Task } from '@dxos/types';

import { AssistantOperation } from '#types';

import { resumePrompt } from '../operations/resume-prompt.ts';

type AnswerInvocation = {
  input: Operation.Definition.Input<typeof TaskOperation.AnswerQuestion>;
  output: Operation.Definition.Output<typeof TaskOperation.AnswerQuestion>;
};

/** Narrows an invocation to the task pane's answer, whose input and output its definition types. */
const isAnswer = <E extends { operation: Operation.Definition.Any }>(event: E): event is E & AnswerInvocation =>
  event.operation.meta.key.toString() === TaskOperation.AnswerQuestion.meta.key.toString();

/**
 * Wakes the chat that asked a question when it is answered anywhere but the chat itself.
 *
 * plugin-tasks' `AnswerQuestion` (the task pane's) only records the answer, since plugin-tasks cannot
 * reach an agent; without this, an agent that asked from a chat would stay blocked on an answer it
 * is never told about. The chat's own card answers through `AssistantOperation.AnswerQuestion`, which
 * resumes by itself and never reaches this listener.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const invoker = yield* Capabilities.OperationInvoker;

    yield* Effect.forkScoped(
      Stream.fromPubSub(invoker.invocations).pipe(
        Stream.filter(isAnswer),
        Stream.filter((event) => event.output.accepted),
        Stream.runForEach((event) =>
          Effect.gen(function* () {
            const { task: taskRef, question: questionId } = event.input;
            const task = yield* Effect.promise(() => taskRef.load());
            if (!Obj.instanceOf(Task.Task, task)) {
              return;
            }
            const thread = Task.getQuestions(task.history).find(({ question }) => question.id === questionId);
            const chat = yield* Effect.promise(async () => thread?.question.conversation?.load());
            const spaceId = chat && Obj.getDatabase(chat)?.spaceId;
            if (!chat || !Obj.instanceOf(Chat.Chat, chat) || !spaceId) {
              return;
            }
            yield* invoker.invoke(
              AssistantOperation.RunPromptInChat,
              { chat, disposition: 'synthetic', prompt: resumePrompt({ task, questionId }) },
              { spaceId },
            );
          }).pipe(
            // The answer is already durable: failing to wake the agent must not stop the listener,
            // though interruption still ends it with its scope.
            Effect.catchCause((cause) =>
              Cause.hasInterruptsOnly(cause)
                ? Effect.failCause(cause)
                : Effect.sync(() =>
                    log.warn('answered question did not resume its chat', { cause: Cause.pretty(cause) }),
                  ),
            ),
          ),
        ),
      ),
    );

    return [];
  }),
);
