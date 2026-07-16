//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Markdown } from '@dxos/plugin-markdown';
import { Text } from '@dxos/schema';

import { Blog } from './index';

describe('Blog schema', () => {
  test('makePost creates outline + a body document, both owned by it, and defaults to draft status', () => {
    const post = Blog.makePost({ name: 'Hello' });
    expect(post.name).toBe('Hello');
    expect(post.status).toBe('draft');

    const outline = post.outline.target;
    invariant(outline);
    expect(Obj.instanceOf(Text.Text, outline)).toBe(true);
    expect(Obj.getParent(outline)).toBe(post);

    const content = post.content.target;
    invariant(content);
    expect(Obj.instanceOf(Markdown.Document, content)).toBe(true);
    expect(Obj.getParent(content)).toBe(post);
  });

  test('makePublication holds instructions + empty posts', () => {
    const publication = Blog.makePublication({ name: 'Blog' });
    const instructions = publication.instructions.target;
    invariant(instructions);
    expect(Obj.instanceOf(Text.Text, instructions)).toBe(true);
    expect(publication.posts).toEqual([]);
  });
});
