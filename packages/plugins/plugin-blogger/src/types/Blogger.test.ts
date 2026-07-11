//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { Markdown } from '@dxos/plugin-markdown';

import { Blogger } from './index';

describe('Blogger schema', () => {
  test('makeDraft wraps a markdown document owned by the draft', () => {
    const draft = Blogger.makeDraft({ label: 'Draft 1', createdAt: '2026-07-11T00:00:00Z' });
    expect(Obj.instanceOf(Blogger.Draft, draft)).toBe(true);
    expect(Obj.instanceOf(Markdown.Document, draft.content.target!)).toBe(true);
    expect(Obj.getParent(draft.content.target!)).toBe(draft);
  });

  test('makePost creates outline + one initial draft', () => {
    const post = Blogger.makePost({ name: 'Hello' });
    expect(post.name).toBe('Hello');
    expect(Obj.instanceOf(Markdown.Document, post.outline.target!)).toBe(true);
    expect(post.drafts).toHaveLength(1);
    expect(Obj.instanceOf(Blogger.Draft, post.drafts?.[0]?.target)).toBe(true);
  });

  test('makePublication holds instructions + empty posts', () => {
    const publication = Blogger.makePublication({ name: 'Blog' });
    expect(Obj.instanceOf(Markdown.Document, publication.instructions.target!)).toBe(true);
    expect(publication.posts).toEqual([]);
  });
});
