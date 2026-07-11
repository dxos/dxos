//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { Markdown } from '@dxos/plugin-markdown';

/**
 * A single version of a post; wraps a commentable markdown document.
 */
export class Draft extends Type.makeObject<Draft>(DXN.make('org.dxos.type.blogger.draft', '0.1.0'))(
  Schema.Struct({
    label: Schema.optional(Schema.String),
    createdAt: Schema.optional(Schema.String),
    content: Ref.Ref(Markdown.Document).pipe(FormInputAnnotation.set(false)),
  }).pipe(LabelAnnotation.set(['label'])),
) {}

/**
 * A blog post: a planning outline plus ordered drafts (versions).
 */
export class Post extends Type.makeObject<Post>(DXN.make('org.dxos.type.blogger.post', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    summary: Schema.optional(Schema.String),
    outline: Ref.Ref(Markdown.Document).pipe(FormInputAnnotation.set(false)),
    drafts: Schema.Array(Ref.Ref(Draft)).pipe(FormInputAnnotation.set(false), Schema.optional),
  }).pipe(LabelAnnotation.set(['name']), Annotation.IconAnnotation.set({ icon: 'ph--article--regular', hue: 'amber' })),
) {}

/**
 * A collection of posts with shared base instructions for the assistant agent.
 */
export class Publication extends Type.makeObject<Publication>(DXN.make('org.dxos.type.blogger.publication', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    instructions: Ref.Ref(Markdown.Document).pipe(FormInputAnnotation.set(false)),
    posts: Schema.Array(Ref.Ref(Post)).pipe(FormInputAnnotation.set(false), Schema.optional),
  }).pipe(LabelAnnotation.set(['name']), Annotation.IconAnnotation.set({ icon: 'ph--books--regular', hue: 'amber' })),
) {}

// Build the child document and its ref before Obj.make (mirrors Markdown.make), then set parent
// ownership after construction so the ref is supplied at creation time, never deferred.

export const makeDraft = ({
  label,
  createdAt,
  content = '',
}: { label?: string; createdAt?: string; content?: string } = {}): Draft => {
  const doc = Markdown.make({ content });
  const draft = Obj.make(Draft, { label, createdAt, content: Ref.make(doc) });
  Obj.setParent(doc, draft);
  return draft;
};

export const makePost = ({ name, summary }: { name?: string; summary?: string } = {}): Post => {
  const outline = Markdown.make({});
  const draft = makeDraft({ label: 'Draft 1' });
  const post = Obj.make(Post, { name, summary, outline: Ref.make(outline), drafts: [Ref.make(draft)] });
  Obj.setParent(outline, post);
  Obj.setParent(draft, post);
  return post;
};

export const makePublication = ({ name }: { name?: string } = {}): Publication => {
  const instructions = Markdown.make({});
  const publication = Obj.make(Publication, { name, instructions: Ref.make(instructions), posts: [] });
  Obj.setParent(instructions, publication);
  return publication;
};
