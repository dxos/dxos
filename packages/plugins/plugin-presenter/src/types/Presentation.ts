//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as Skill from '@dxos/compute/Skill';
import { Annotation, Collection, DXN, Format, Obj, Ref, Type } from '@dxos/echo';
import * as MediaArtifact from '@dxos/plugin-studio/MediaArtifact';
import * as Variant from '@dxos/plugin-studio/Variant';
import { Text } from '@dxos/schema';

import { meta } from '#meta';

import { splitSlides } from '../markdown/split.ts';
import * as SlideTheme from './SlideTheme.ts';

/** Key of the presenter skill, attached to the Presentation type. */
export const SKILL_KEY = 'org.dxos.skill.presenter';

/**
 * One slide of a presentation, owned by it: its content (an owned markdown `Text`, parented to the slide, or a link to
 * any ECHO object) and the slide's own metadata, which applies whatever the content is.
 */
export class Slide extends Type.makeObject<Slide>(DXN.make('org.dxos.type.slide', '0.1.0'))(
  Schema.Struct({
    /** An owned `Text` (parented to this slide) or a linked object, which keeps its own parent. */
    content: Ref.Ref(Obj.Unknown).pipe(Annotation.FormInputAnnotation.set(false)),
    /** Overrides the label read from the content's first heading. */
    title: Schema.optional(Schema.String),
    /** Left out when the deck is presented; the grid still shows it. */
    hidden: Schema.optional(Schema.Boolean),
    /** Recorded voice-overs of the slide (takes), owned by it, oldest first. */
    takes: Schema.Array(Ref.Ref(Variant.Variant)).pipe(
      Annotation.SetParent.set(),
      Annotation.FormInputAnnotation.set(false),
      Schema.optional,
    ),
    /** The take that voices the slide when the presentation's voice-over is played or exported. */
    mainTake: Schema.optional(Ref.Ref(Variant.Variant)).pipe(Annotation.FormInputAnnotation.set(false)),
    /** Desired length in seconds, shown against the time spent on the slide while presenting. */
    duration: Schema.optional(
      Schema.Number.pipe(Schema.check(Schema.isGreaterThan(0))).annotate({
        title: 'Duration',
        description: 'Desired length of the slide, in seconds.',
      }),
    ),
    /** Speaker notes, for any content. */
    notes: Schema.optional(Ref.Ref(Text.Text)).pipe(Annotation.FormInputAnnotation.set(false)),
    /** The image a layout places (cover and image layouts): a generated media artifact. */
    image: Schema.optional(Ref.Ref(MediaArtifact.MediaArtifact)).pipe(Annotation.FormInputAnnotation.set(false)),
  }).pipe(
    Annotation.LabelAnnotation.set(['title']),
    Annotation.IconAnnotation.set({ icon: 'ph--rectangle--regular', hue: 'orange' }),
    Skill.SkillsAnnotation.set([SKILL_KEY]),
  ),
) {}

/**
 * An ordered deck of slides, each a `Slide` it owns.
 */
export class Presentation extends Type.makeObject<Presentation>(DXN.make('org.dxos.type.presentation', '0.2.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Text))),
    /** Slides in order, each parented to the presentation. */
    slides: Schema.Array(Ref.Ref(Slide)).pipe(Annotation.FormInputAnnotation.set(false)),
    /** Overrides the first slide's `theme:` headmatter for every slide, linked objects included; edited by `PresentationProperties`. */
    theme: Schema.optional(SlideTheme.Settings).pipe(Annotation.FormInputAnnotation.set(false)),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--presentation--regular', hue: 'orange' }),
    Annotation.UserType.set({ tags: [Collection.ItemTag] }),
    Skill.SkillsAnnotation.set([SKILL_KEY]),
    // Its navtree node lists `slides`; a slide is deleted only through the undoable space Delete.
    AppAnnotation.ContainerAnnotation.set({
      property: 'slides',
      deleteOwned: true,
      removeLabel: ['remove-section.label', { ns: meta.profile.key }],
    }),
  ),
) {}

const clampIndex = (index: number | undefined, length: number): number =>
  index === undefined ? length : Math.max(0, Math.min(index, length));

/**
 * A slide showing `content`; owned markdown `Text` content is parented to the slide.
 */
export const makeSlide = (content: Obj.Unknown, props: Omit<Partial<Slide>, 'content'> = {}): Slide => {
  const slide = Obj.make(Slide, { ...props, content: Ref.make(content) });
  if (Obj.instanceOf(Text.Text, content)) {
    Obj.setParent(content, slide);
  }
  return slide;
};

/**
 * Creates a presentation with one owned markdown slide per string.
 */
type MakeProps = { name?: string; description?: string; theme?: SlideTheme.Settings };

export const make = ({
  name,
  description,
  theme,
  slides = [],
}: MakeProps & { slides?: string[] } = {}): Presentation => {
  const owned = slides.map((content) => makeSlide(Text.make({ content })));
  const presentation = Obj.make(Presentation, {
    name,
    description,
    theme,
    slides: owned.map((slide) => Ref.make(slide)),
  });
  // Parent is set after the refs exist because setParent warns when the parent holds no ref.
  for (const slide of owned) {
    Obj.setParent(slide, presentation);
  }
  return presentation;
};

/**
 * A presentation from one Slidev markdown document: a slide per `---`, each keeping its own frontmatter.
 */
export const makeFromMarkdown = ({ markdown, ...props }: MakeProps & { markdown: string }): Presentation =>
  make({ ...props, slides: splitSlides(markdown) });

/**
 * Whether a slide's content is its own markdown `Text`, rather than a linked object.
 */
export const isOwnedContent = (slide: Slide, content: Obj.Unknown): content is Text.Text =>
  Obj.instanceOf(Text.Text, content) && Obj.getParent(content)?.id === slide.id;

/**
 * The slide an object belongs to: the slide itself, or the slide owning a markdown `Text`.
 */
export const getSlide = (object: Obj.Unknown): Slide | undefined => {
  if (Obj.instanceOf(Slide, object)) {
    return object;
  }
  const parent = Obj.getParent(object);
  return Obj.instanceOf(Slide, parent) ? parent : undefined;
};

/**
 * The presentation a slide, or a slide's owned `Text`, belongs to.
 */
export const getPresentation = (object: Obj.Unknown): Presentation | undefined => {
  const slide = getSlide(object);
  const parent = slide && Obj.getParent(slide);
  return Obj.instanceOf(Presentation, parent) ? parent : undefined;
};

/**
 * The slide showing `object`, if the presentation has one (the object is its content, or the slide itself).
 */
export const findSlide = (presentation: Presentation, object: Obj.Unknown): Slide | undefined =>
  presentation.slides
    .map((ref) => ref.target)
    .find((slide): slide is Slide => !!slide && (slide.id === object.id || Ref.hasEntityId(object.id)(slide.content)));

/**
 * Inserts a new owned markdown slide at the index (default: append).
 */
export const addSlide = (presentation: Presentation, content: string, index?: number): Slide => {
  const slide = makeSlide(Text.make({ content }));
  Obj.update(presentation, (presentation) => {
    presentation.slides.splice(clampIndex(index, presentation.slides.length), 0, Ref.make(slide));
    // Inside the update so subscribers never see the slide before its owner.
    Obj.setParent(slide, presentation);
  });
  return slide;
};

/**
 * Links an existing object as a new slide without taking ownership of it; no-op if a slide already shows it.
 */
export const link = (presentation: Presentation, object: Obj.Unknown, index?: number): Slide | undefined => {
  if (findSlide(presentation, object)) {
    return undefined;
  }
  const slide = makeSlide(object);
  Obj.update(presentation, (presentation) => {
    presentation.slides.splice(clampIndex(index, presentation.slides.length), 0, Ref.make(slide));
    Obj.setParent(slide, presentation);
  });
  return slide;
};

/**
 * Removes a slide (given the slide or the object it shows): the slide and its owned content are deleted, a linked
 * object is only unlinked.
 */
export const remove = (presentation: Presentation, target: Obj.Unknown): void => {
  const slide = Obj.instanceOf(Slide, target) ? target : findSlide(presentation, target);
  const index = slide ? presentation.slides.findIndex(Ref.hasEntityId(slide.id)) : -1;
  if (!slide || index < 0) {
    return;
  }
  Obj.update(presentation, (presentation) => {
    presentation.slides.splice(index, 1);
  });
  const db = Obj.getDatabase(slide);
  const content = slide.content.target;
  if (content && isOwnedContent(slide, content)) {
    db?.remove(content);
  }
  db?.remove(slide);
};

/**
 * Moves the slide at `from` to `to`.
 */
export const move = (presentation: Presentation, from: number, to: number): void => {
  Obj.update(presentation, (presentation) => {
    if (from < 0 || from >= presentation.slides.length) {
      return;
    }
    // A fresh ref is required because a ref already held by the array fails validation on re-insert.
    const slide = Ref.fromURI(presentation.slides[from].uri);
    presentation.slides.splice(from, 1);
    presentation.slides.splice(clampIndex(to, presentation.slides.length), 0, slide);
  });
};
