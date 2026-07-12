//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Markdown } from '@dxos/plugin-markdown';

import { Blogger } from './index';

describe('Blogger schema', () => {
  test('makeDraft wraps a markdown document owned by the draft', () => {
    const draft = Blogger.makeDraft({ label: 'Draft 1' });
    expect(Obj.instanceOf(Blogger.Draft, draft)).toBe(true);
    const content = draft.content.target;
    invariant(content);
    expect(Obj.instanceOf(Markdown.Document, content)).toBe(true);
    expect(Obj.getParent(content)).toBe(draft);
  });

  test('makePost creates outline + one initial draft', () => {
    const post = Blogger.makePost({ name: 'Hello' });
    expect(post.name).toBe('Hello');
    const outline = post.outline.target;
    invariant(outline);
    expect(Obj.instanceOf(Markdown.Document, outline)).toBe(true);
    expect(post.drafts).toHaveLength(1);
    expect(Obj.instanceOf(Blogger.Draft, post.drafts?.[0]?.target)).toBe(true);
  });

  test('makePublication holds instructions + empty posts', () => {
    const publication = Blogger.makePublication({ name: 'Blog' });
    const instructions = publication.instructions.target;
    invariant(instructions);
    expect(Obj.instanceOf(Markdown.Document, instructions)).toBe(true);
    expect(publication.posts).toEqual([]);
  });
});
