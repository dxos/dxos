//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Task } from '@dxos/types';

import { renderDelegationBrief } from './task-brief.ts';

describe('renderDelegationBrief', () => {
  test('asks for a draft pull request attached to the task, and never a merge', ({ expect }) => {
    const brief = renderDelegationBrief({
      tasks: [Task.make({ title: 'Rework space selection' })],
      project: undefined,
      context: undefined,
    });

    expect(brief).toContain('`gh pr create --draft`');
    expect(brief).toContain('Never push to the default branch');
    expect(brief).toContain('never merge unless the person tells you to');
    expect(brief).toContain('merge only once every check is green');
    expect(brief).toContain('EnterWorktree');
    expect(brief).toContain('attach it to the task it implements');
    expect(brief).not.toContain('do not push or merge');
  });
});
