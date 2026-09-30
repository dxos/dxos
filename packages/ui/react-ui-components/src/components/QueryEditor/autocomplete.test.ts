//
// Copyright 2026 DXOS.org
//

import { EditorState } from '@codemirror/state';
import { describe, expect, test } from 'vitest';

import { Tag } from '@dxos/echo';

import { completions } from './autocomplete.ts';

const tags: Tag.Map = {
  tag_1: Tag.make({ label: 'important' }),
  tag_2: Tag.make({ label: 'investor' }),
};

/**
 * Selecting a completion replaces the WHOLE trigger range — the `#` included — and inserts the item
 * verbatim, so an unprefixed label would drop the `#` and leave text that no longer parses as a tag.
 */
describe('tag completions', () => {
  test('carry the `#`, so the inserted text is still a tag', () => {
    expect(optionsAt('#')).toEqual(['#important', '#investor']);
  });

  test('are offered while the label is being typed', () => {
    expect(optionsAt('#imp')).toEqual(['#important', '#investor']);
  });

  test('are offered for a tag later in the query', () => {
    expect(optionsAt('type:org.dxos.Person AND #inv')).toEqual(['#important', '#investor']);
  });

  test('are not offered away from a tag', () => {
    expect(optionsAt('type:')).not.toContain('#important');
  });

  // Only once the string is closed: until then the parser recovers by reading the `"` as an error and
  // `#imp` as a real tag, so the tree has no string to resolve into.
  test('are not offered inside a closed string, where `#` is content', () => {
    expect(optionsAt('{ title: "#imp" }', 14)).toEqual([]);
  });
});

const optionsAt = (doc: string, pos = doc.length) =>
  completions({ tags })({ state: EditorState.create({ doc }), pos, text: doc });
