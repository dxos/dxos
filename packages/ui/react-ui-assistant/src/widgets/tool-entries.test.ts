//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type ContentBlock } from '@dxos/types';

import { toEntries } from './tool-entries.ts';

const call = (toolCallId: string, name: string): ContentBlock.Any => ({
  _tag: 'toolCall',
  toolCallId,
  name,
  input: '{}',
  providerExecuted: false,
});

const result = (toolCallId: string, name: string, value: string): ContentBlock.Any => ({
  _tag: 'toolResult',
  toolCallId,
  name,
  providerExecuted: false,
  result: value,
});

describe('toEntries', () => {
  test('parallel results answer their own call, whatever order they arrive in', ({ expect }) => {
    const entries = toEntries([
      call('1', 'querySkills'),
      call('2', 'queryObjects'),
      result('1', 'querySkills', 'skills'),
      result('2', 'queryObjects', 'objects'),
    ]);
    expect(entries.map(({ title, result }) => [title, result])).toEqual([
      ['querySkills', 'skills'],
      ['queryObjects', 'objects'],
    ]);
  });

  test('a result without a known call id answers the latest unanswered call', ({ expect }) => {
    const entries = toEntries([call('1', 'a'), call('2', 'b'), result('unknown', 'b', 'ok')]);
    expect(entries.map(({ result }) => result)).toEqual([undefined, 'ok']);
  });
});
