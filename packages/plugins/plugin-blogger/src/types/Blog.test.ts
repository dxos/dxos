//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { describe, expect, test } from 'vitest';

import { Obj, Type } from '@dxos/echo';
import { HiddenAnnotation } from '@dxos/echo/Annotation';
import { invariant } from '@dxos/invariant';
import { Markdown } from '@dxos/plugin-markdown';
import { Text } from '@dxos/schema';

import { Blog } from './index';

describe('Blog schema', () => {
  test('makeDraft wraps a markdown document owned by the draft', () => {
    const draft = Blog.makeDraft({ label: 'Draft 1' });
    expect(Obj.instanceOf(Blog.Draft, draft)).toBe(true);
    const content = draft.content.target;
    invariant(content);
    expect(Obj.instanceOf(Markdown.Document, content)).toBe(true);
    expect(Obj.getParent(content)).toBe(draft);
  });

  test('makePost creates outline + one initial draft', () => {
    const post = Blog.makePost({ name: 'Hello' });
    expect(post.name).toBe('Hello');
    const outline = post.outline.target;
    invariant(outline);
    expect(Obj.instanceOf(Text.Text, outline)).toBe(true);
    expect(post.drafts).toHaveLength(1);
    expect(Obj.instanceOf(Blog.Draft, post.drafts?.[0]?.target)).toBe(true);
  });

  test('makePublication holds instructions + empty posts', () => {
    const publication = Blog.makePublication({ name: 'Blog' });
    const instructions = publication.instructions.target;
    invariant(instructions);
    expect(Obj.instanceOf(Text.Text, instructions)).toBe(true);
    expect(publication.posts).toEqual([]);
  });

  test('Draft is hidden from the space type listing; Post and Publication are not', () => {
    const isHidden = (schema: Parameters<typeof HiddenAnnotation.get>[0]) =>
      HiddenAnnotation.get(schema).pipe(Option.getOrElse(() => false));
    expect(isHidden(Type.getSchema(Blog.Draft))).toBe(true);
    expect(isHidden(Type.getSchema(Blog.Post))).toBe(false);
    expect(isHidden(Type.getSchema(Blog.Publication))).toBe(false);
  });
});
