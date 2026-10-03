//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from '@effect/vitest';

import { ATTR_META, ATTR_TYPE } from '@dxos/echo/internal';
import { DXN, EntityId } from '@dxos/keys';

import { extractIndexableText } from './text-extractor.ts';

const TYPE_PERSON = DXN.make('com.example.type.person', '0.1.0');

describe('extractIndexableText', () => {
  test('collects string values', () => {
    const text = extractIndexableText({
      id: EntityId.random(),
      [ATTR_TYPE]: TYPE_PERSON,
      title: 'Hello Effect',
      body: 'A message about SQL.',
    });

    expect(text.split('\n')).toEqual(['Hello Effect', 'A message about SQL.']);
  });

  test('omits property names', () => {
    const text = extractIndexableText({
      id: EntityId.random(),
      [ATTR_TYPE]: TYPE_PERSON,
      description: 'content',
    });

    expect(text).toBe('content');
    expect(text).not.toContain('description');
  });

  test('omits the id, the type and the meta block', () => {
    const objectId = EntityId.random();
    const text = extractIndexableText({
      id: objectId,
      [ATTR_TYPE]: TYPE_PERSON,
      [ATTR_META]: { keys: [{ source: 'example.com', id: 'external-key' }] },
      title: 'Visible',
    });

    expect(text).toBe('Visible');
    expect(text).not.toContain(objectId);
    expect(text).not.toContain('com.example.type.person');
    expect(text).not.toContain('external-key');
  });

  test('omits references but keeps text beside them', () => {
    const text = extractIndexableText({
      id: EntityId.random(),
      [ATTR_TYPE]: TYPE_PERSON,
      title: 'Task',
      assignee: { '/': 'dxn:echo:@:01JXXXXXXXXXXXXXXXXXXXXXXX' },
    });

    expect(text).toBe('Task');
  });

  test('descends into nested objects and arrays', () => {
    const text = extractIndexableText({
      id: EntityId.random(),
      [ATTR_TYPE]: TYPE_PERSON,
      tags: ['alpha', 'beta'],
      address: { city: 'Lisbon', zip: '1000' },
      blocks: [{ content: { text: 'nested body' } }],
    });

    expect(text.split('\n')).toEqual(['alpha', 'beta', 'Lisbon', '1000', 'nested body']);
  });

  test('drops non-string values and blank strings', () => {
    const text = extractIndexableText({
      id: EntityId.random(),
      [ATTR_TYPE]: TYPE_PERSON,
      count: 42,
      done: true,
      missing: null,
      blank: '   ',
      title: '  Trimmed  ',
    });

    expect(text).toBe('Trimmed');
  });

  test('returns an empty string for an object with no text', () => {
    expect(extractIndexableText({ id: EntityId.random(), [ATTR_TYPE]: TYPE_PERSON })).toBe('');
  });
});
