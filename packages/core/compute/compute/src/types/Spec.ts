//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Format, Obj, Ref, Type } from '@dxos/echo';
import { Text } from '@dxos/schema';

/**
 * A spec: normative `.mdl` text that its project's work delivers. Its dialects say which block kinds beyond the core
 * and changelog ones the text uses, which a plugin then extracts into objects of its own and keeps as annotations on
 * the spec. A project owns its specs (`Project.specs`), so a spec is not a type of its own in a space. A `.mdl` file's
 * front matter is the spec's fields and meta rather than its text: `name` is `name`, `id` and `version` are the
 * meta's `key` and `version`.
 */
export class Spec extends Type.makeObject<Spec>(DXN.make('org.dxos.type.projects.spec', '0.3.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.annotate({ title: 'Name' })),

    description: Schema.optional(
      Schema.String.pipe(
        Format.FormatAnnotation.set(Format.TypeFormat.Markdown),
        Schema.annotate({
          title: 'Description',
          description: 'What the spec describes when its work is complete.',
        }),
      ),
    ),

    /**
     * The ids of the dialect specs whose blocks the text uses, as a `.mdl` file lists them in its front matter's
     * `extends`. Empty means the core and changelog blocks only.
     */
    dialects: Schema.Array(Schema.String).pipe(Annotation.FormInputAnnotation.set(false)),

    /** The `.mdl` text; owned, so it is deleted with the spec. */
    content: Ref.Ref(Text.Text).pipe(Annotation.SetParent.set(), Annotation.FormInputAnnotation.set(false)),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--blueprint--regular', hue: 'violet' }),
  ),
) {}

export type MakeProps = Omit<Obj.MakeProps<typeof Spec>, 'dialects' | 'content'> &
  Partial<Pick<Obj.MakeProps<typeof Spec>, 'dialects'>> & {
    /** The `.mdl` text, without front matter; empty by default. */
    content?: string;
  };

/** `dialects` starts as an empty list so two peers lazily creating it cannot each write a fresh one. */
export const make = ({ content, dialects = [], ...props }: MakeProps): Spec =>
  Obj.make(Spec, {
    ...props,
    dialects: [...dialects],
    content: Ref.make(Text.make({ content: content ?? '' })),
  });

export const instanceOf = (value: unknown): value is Spec => Obj.instanceOf(Spec, value);
