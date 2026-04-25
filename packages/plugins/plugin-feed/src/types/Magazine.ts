//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Format, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { Text } from '@dxos/schema';

import * as Subscription from './Subscription';

/**
 * An agent-curated collection of articles drawn from one or more Feeds.
 * The user describes what content the Magazine should gather via a long-form
 * instructions Text. A curation flow reads the instructions, selects matching
 * Posts, enriches them with snippet and hero image, and appends their refs here.
 */
export const Magazine = Schema.Struct({
  /** User-facing title of the magazine. */
  name: Schema.String.pipe(Schema.optional),
  /** Feeds to pull content from. */
  feeds: Schema.Array(Ref.Ref(Subscription.Feed)),
  /** Long-form brief describing what content the Magazine should gather. */
  instructions: Ref.Ref(Text.Text).pipe(
    Format.FormatAnnotation.set(Format.TypeFormat.Markdown),
    Schema.annotations({ title: 'Instructions' }),
  ),
  /** Curated Post refs (insertion order; UI displays newest-last reversed). */
  posts: Schema.Array(Ref.Ref(Subscription.Post)).pipe(FormInputAnnotation.set(false)),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.magazine',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--newspaper-clipping--regular',
    hue: 'indigo',
  }),
);

export interface Magazine extends Schema.Schema.Type<typeof Magazine> {}

/** Checks if a value is a Magazine object. */
export const instanceOf = (value: unknown): value is Magazine => Obj.instanceOf(Magazine, value);

/** Creates a Magazine with an empty instructions Text object. */
export const make = (
  props: Omit<Obj.MakeProps<typeof Magazine>, 'instructions' | 'feeds' | 'posts'> & {
    instructions?: string;
    feeds?: Ref.Ref<Subscription.Feed>[];
    posts?: Ref.Ref<Subscription.Post>[];
  } = {},
): Magazine =>
  Obj.make(Magazine, {
    ...props,
    feeds: props.feeds ?? [],
    instructions: Ref.make(Text.make(props.instructions ?? '')),
    posts: props.posts ?? [],
  });

/** Schema for the create-magazine dialog form. */
export const CreateMagazineSchema = Schema.Struct({
  name: Schema.optional(
    Schema.String.annotations({
      title: 'Name',
    }),
  ),
  instructions: Schema.optional(
    Schema.String.annotations({
      title: 'Instructions',
      description: 'Describe what content the Magazine should gather.',
    }),
  ),
});
