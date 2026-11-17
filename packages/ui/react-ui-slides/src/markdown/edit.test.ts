//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import {
  SNIPPETS,
  applyEdit,
  columnSnippet,
  insertSnippet,
  isHiddenSlide,
  notesEdit,
  setFrontmatter,
  surfaceSnippet,
} from './edit.ts';
import { parseSlide } from './parse.ts';

describe('setFrontmatter', () => {
  test('adds a block to a slide without one', () => {
    const content = applyEdit('# Title', setFrontmatter('# Title', { layout: 'center' }));
    expect(content).toBe('---\nlayout: center\n---\n\n# Title');
    expect(parseSlide(content).layout).toBe('center');
  });

  test('replaces one key and keeps the others, their order and comments', () => {
    const before = '---\n# kept\nlayout: cover\nimage: a.png\n---\n# Title';
    const content = applyEdit(before, setFrontmatter(before, { layout: 'two-cols' }));
    expect(content).toBe('---\n# kept\nlayout: two-cols\nimage: a.png\n---\n# Title');
  });

  test('removing the last key removes the block', () => {
    const before = '---\nlayout: cover\n---\n# Title';
    expect(applyEdit(before, setFrontmatter(before, { layout: undefined }))).toBe('# Title');
  });

  test('malformed or non-mapping frontmatter is left as written', () => {
    for (const before of ['---\nlayout: [cover\n---\n# Title', '---\n- a\n- b\n---\n# Title']) {
      expect(applyEdit(before, setFrontmatter(before, { layout: 'center' }))).toBe(before);
    }
  });

  test('sets numbers as numbers', () => {
    const content = applyEdit('', setFrontmatter('', { backgroundOpacity: 0.5 }));
    expect(parseSlide(content).frontmatter.backgroundOpacity).toBe(0.5);
  });
});

describe('isHiddenSlide', () => {
  test('reads `hide: true` from the frontmatter only', () => {
    expect(isHiddenSlide('---\nhide: true\n---\n\n# Slide')).toBe(true);
    expect(isHiddenSlide('---\nhide: false\n---\n\n# Slide')).toBe(false);
    expect(isHiddenSlide('# Slide\n\nhide: true')).toBe(false);
  });
});

describe('columnSnippet', () => {
  test('starts the given slot with the cursor below its marker', () => {
    expect(columnSnippet('bottom-left')).toBe('\n::bottom-left::\n\n|');
  });
});

describe('insertSnippet', () => {
  test('a click group at a line start puts the cursor inside it', () => {
    const edit = insertSnippet('# Title\n', 8, SNIPPETS.click);
    const content = applyEdit('# Title\n', edit);
    expect(content).toBe('# Title\n<v-click>\n\n\n\n</v-click>\n');
    expect(content.slice(edit.cursor - 11, edit.cursor)).toBe('<v-click>\n\n');
    expect(parseSlide(content).issues).toEqual([]);
  });

  test('mid-line, the snippet starts a new block', () => {
    const edit = insertSnippet('Hello', 5, surfaceSnippet('echo:///A'));
    expect(applyEdit('Hello', edit)).toBe('Hello\n\n<Surface ref="echo:///A" />\n');
  });
});

describe('notesEdit', () => {
  test('adds empty notes and places the cursor inside', () => {
    const edit = notesEdit('# Title');
    const content = applyEdit('# Title', edit);
    expect(content).toBe('# Title\n\n<!--\n\n-->\n');
    expect(content.slice(0, edit.cursor).endsWith('<!--\n')).toBe(true);
    expect(parseSlide(content).notes).toBe('');
  });

  test('moves to the end of existing notes without changing the text', () => {
    const content = '# Title\n\n<!--\nSay hello.\n-->';
    const edit = notesEdit(content);
    expect(edit.insert).toBe('');
    expect(content.slice(0, edit.cursor).endsWith('Say hello.')).toBe(true);
  });
});
