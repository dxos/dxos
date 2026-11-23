//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Trajectory from '@dxos/compute/Trajectory';
import { Obj } from '@dxos/echo';

import { MAIN, toCommits } from './trajectory-commits.ts';

const user: Trajectory.Sender = { role: 'user', name: 'alice' };
const assistant: Trajectory.Sender = { role: 'assistant' };

/** An opener on a branch of its own, named after it, as `Feed.fork` writes it. */
const opener = (payload: Trajectory.TurnBegin | Trajectory.ThreadOpen) => {
  const id = Obj.ID.random();
  return Trajectory.make({ id, payload, sender: assistant, thread: Trajectory.ThreadId.make(id) });
};

const say = (text: string, sender: Trajectory.Sender, thread?: Trajectory.ThreadId) =>
  Trajectory.make({ payload: { _tag: 'message', blocks: [{ _tag: 'text', text }] }, sender, thread });

describe('toCommits', () => {
  test('a commit per event on its branch, and a merge where a turn ends', ({ expect }) => {
    const prompt = say('What is 17 × 23?', user);
    const turn = opener({ _tag: 'turnBegin', from: { event: prompt.id } });
    const thread = Trajectory.ThreadId.make(turn.id);
    const answer = say('391', assistant, thread);
    const end = Trajectory.make({ payload: { _tag: 'turnEnd', finishReason: 'stop' }, sender: assistant, thread });
    const next = say('And 18 × 23?', user);

    const commits = toCommits([prompt, turn, answer, end, next]);
    expect(commits.map((commit) => [commit.branch, commit.message])).toEqual([
      [MAIN, 'alice: What is 17 × 23?'],
      ['turn 1', 'turn begins'],
      ['turn 1', 'assistant: 391'],
      ['turn 1', 'turn ends (stop)'],
      [MAIN, 'alice: And 18 × 23?'],
    ]);
    expect(commits[2].parents).toEqual([turn.id]);
    // The next commit on main has two parents: main before it, and the turn that merged in.
    expect(commits[4].parents).toEqual([prompt.id, end.id]);
  });

  test('a light thread is a branch named by its purpose, and a turn in it merges back into it', ({ expect }) => {
    const prompt = say('Translate the summary.', user);
    const light = opener({ _tag: 'threadOpen', mode: 'light', purpose: 'Translate', from: { event: prompt.id } });
    const lightThread = Trajectory.ThreadId.make(light.id);
    const turn = opener({ _tag: 'turnBegin', from: { thread: lightThread, event: light.id } });
    const turnThread = Trajectory.ThreadId.make(turn.id);
    const end = Trajectory.make({
      payload: { _tag: 'turnEnd', finishReason: 'stop' },
      sender: assistant,
      thread: turnThread,
    });
    const after = say('Done.', assistant, lightThread);

    const commits = toCommits([prompt, light, turn, end, after]);
    expect(commits.map((commit) => commit.branch)).toEqual([MAIN, 'Translate', 'turn 1', 'turn 1', 'Translate']);
    expect(commits[4].parents).toEqual([light.id, end.id]);
  });
});
