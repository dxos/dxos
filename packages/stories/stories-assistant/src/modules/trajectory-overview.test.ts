//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Reducer from '@dxos/compute/Reducer';
import * as Trajectory from '@dxos/compute/Trajectory';
import { Obj } from '@dxos/echo';

import { QUEUE, TRUNK, toOverview } from './trajectory-overview.ts';

const user: Trajectory.Sender = { role: 'user', name: 'alice' };
const assistant: Trajectory.Sender = { role: 'assistant' };
const subagent: Trajectory.Sender = { role: 'assistant', name: 'subagent' };

/** An opener on a branch of its own, named after it, as `Feed.fork` writes it. */
const opener = (payload: Trajectory.TurnBegin | Trajectory.ThreadOpen, sender = assistant) => {
  const id = Obj.ID.random();
  const event = Trajectory.make({ id, payload, sender, thread: Trajectory.ThreadId.make(id) });
  return { event, thread: Trajectory.ThreadId.make(id) };
};

const say = (text: string, sender: Trajectory.Sender, thread?: Trajectory.ThreadId) =>
  Trajectory.make({ payload: { _tag: 'message', blocks: [{ _tag: 'text', text }] }, sender, thread });

const consume = (message: Trajectory.Event, thread: Trajectory.ThreadId) =>
  Trajectory.make({ payload: { _tag: 'promptConsume', message: message.id }, sender: assistant, thread });

/** The tool result a turn gets back when it delegates: it names the subagent's thread. */
const delegated = (subagentThread: Trajectory.ThreadId, thread: Trajectory.ThreadId) =>
  Trajectory.make({
    payload: {
      _tag: 'message',
      blocks: [
        {
          _tag: 'toolResult',
          toolCallId: subagentThread,
          name: 'thread_delegate',
          result: `Started subagent thread ${subagentThread}.`,
          providerExecuted: false,
        },
      ],
    },
    sender: { role: 'tool' },
    thread,
  });

const view = (events: readonly Trajectory.Event[]) => Reducer.run(Reducer.thread, events).state;

const rows = (commits: ReturnType<typeof toOverview>) => commits.map((commit) => [commit.branch, commit.message]);

describe('toOverview', () => {
  test('a finished turn collapses into one task on the trunk, without its messages', ({ expect }) => {
    const prompt = say('What is 17 × 23?', user);
    const turn = opener({ _tag: 'turnBegin', from: { event: prompt.id } });
    const end = Trajectory.make({
      payload: { _tag: 'turnEnd', finishReason: 'stop' },
      sender: assistant,
      thread: turn.thread,
    });
    const commits = toOverview(
      view([prompt, turn.event, consume(prompt, turn.thread), say('391', assistant, turn.thread), end]),
    );
    expect(rows(commits)).toEqual([
      [TRUNK, '1 done · 0 running'],
      [TRUNK, 'What is 17 × 23?'],
    ]);
    expect(commits[1].parents).toEqual([commits[0].id]);
  });

  test('running threads branch off the trunk, subagents off the thread that delegated them', ({ expect }) => {
    // The main job: a turn that delegated three subagents.
    const compare = say('Compare three savings plans.', user);
    const turn = opener({ _tag: 'turnBegin', from: { event: compare.id } });

    // Plan A finished, Plan B runs, Plan C waits for a free slot.
    const planA = opener({ _tag: 'threadOpen', mode: 'fresh', purpose: 'Plan A' }, subagent);
    const taskA = say('Compute plan A in full.', { role: 'user', name: 'task' }, planA.thread);
    const mergeA = Trajectory.make({
      payload: { _tag: 'threadMerge', mode: 'summary' },
      sender: assistant,
      thread: planA.thread,
    });
    const planB = opener({ _tag: 'threadOpen', mode: 'fresh', purpose: 'Plan B' }, subagent);
    const taskB = say('Compute plan B in full.', { role: 'user', name: 'task' }, planB.thread);
    const planC = opener({ _tag: 'threadOpen', mode: 'fresh', purpose: 'Plan C' }, subagent);
    const taskC = say('Compute plan C in full.', { role: 'user', name: 'task' }, planC.thread);

    // A question asked meanwhile runs in a light thread, which waits for the main job.
    const quick = say('Then sum the best two.', user);
    const light = opener({
      _tag: 'threadOpen',
      mode: 'light',
      purpose: 'Then sum the best two.',
      from: { event: quick.id },
    });
    const wait = Trajectory.make({
      payload: { _tag: 'threadWait', on: turn.thread },
      sender: assistant,
      thread: light.thread,
    });

    // A prompt no thread has taken yet.
    const later = say('And what is the capital of Australia?', user);

    const commits = toOverview(
      view([
        compare,
        turn.event,
        consume(compare, turn.thread),
        say('I will hand each plan to a subagent.', assistant, turn.thread),
        planA.event,
        taskA,
        delegated(planA.thread, turn.thread),
        planB.event,
        taskB,
        delegated(planB.thread, turn.thread),
        planC.event,
        taskC,
        delegated(planC.thread, turn.thread),
        consume(taskA, planA.thread),
        mergeA,
        consume(taskB, planB.thread),
        quick,
        light.event,
        consume(quick, light.thread),
        wait,
        later,
      ]),
    );

    expect(rows(commits)).toEqual([
      [TRUNK, '0 done · 2 running · 1 queued'],
      [turn.thread, 'Compare three savings plans.'],
      [turn.thread, 'subagent: Plan A'],
      [planB.thread, 'Plan B'],
      [planC.thread, 'Plan C · queued'],
      [light.thread, 'Then sum the best two. · waiting for Compare three savings plans.'],
      [QUEUE, 'And what is the capital of Australia?'],
    ]);
    const byBranch = (branch: string) => commits.filter((commit) => commit.branch === branch);
    const [header] = commits;
    const [job, doneA] = byBranch(turn.thread);
    // Every thread still running starts from the trunk's head; a subagent from its delegator's.
    expect(job.parents).toEqual([header.id]);
    expect(byBranch(planB.thread)[0].parents).toEqual([doneA.id]);
    expect(byBranch(light.thread)[0].parents).toEqual([header.id]);
    expect(byBranch(QUEUE)[0].parents).toEqual([header.id]);
    // Only the work in progress shimmers.
    expect(commits.filter((commit) => commit.tags?.includes('effect:shimmer')).map((commit) => commit.branch)).toEqual([
      turn.thread,
      planB.thread,
    ]);
  });

  test('the trunk shows only the latest finished tasks and counts the rest', ({ expect }) => {
    const events = Array.from({ length: 4 }, (_, index) => {
      const prompt = say(`Task ${index + 1}`, user);
      const turn = opener({ _tag: 'turnBegin', from: { event: prompt.id } });
      const end = Trajectory.make({
        payload: { _tag: 'turnEnd', finishReason: 'stop' },
        sender: assistant,
        thread: turn.thread,
      });
      return [prompt, turn.event, consume(prompt, turn.thread), end];
    }).flat();
    expect(rows(toOverview(view(events), { history: 2 }))).toEqual([
      [TRUNK, '4 done (2 earlier not shown) · 0 running'],
      [TRUNK, 'Task 3'],
      [TRUNK, 'Task 4'],
    ]);
  });
});
