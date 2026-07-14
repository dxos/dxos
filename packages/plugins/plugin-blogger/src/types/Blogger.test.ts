//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { describe, expect, test } from 'vitest';

import { Obj, Type } from '@dxos/echo';
import { HiddenAnnotation } from '@dxos/echo/Annotation';
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

  test('Draft is hidden from the space type listing; Post and Publication are not', () => {
    const isHidden = (schema: Parameters<typeof HiddenAnnotation.get>[0]) =>
      HiddenAnnotation.get(schema).pipe(Option.getOrElse(() => false));
    expect(isHidden(Type.getSchema(Blogger.Draft))).toBe(true);
    expect(isHidden(Type.getSchema(Blogger.Post))).toBe(false);
    expect(isHidden(Type.getSchema(Blogger.Publication))).toBe(false);
  });
});
