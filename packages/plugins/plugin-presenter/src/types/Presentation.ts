//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { Text } from '@dxos/schema';

/**
 * An ordered deck of sections; each section is an owned markdown `Text` or a link to any ECHO object.
 */
export class Presentation extends Type.makeObject<Presentation>(DXN.make('org.dxos.type.presentation', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    /** Sections in slide order; owned `Text` targets are parented to the presentation. */
    sections: Schema.Array(Ref.Ref(Obj.Unknown)).pipe(Annotation.FormInputAnnotation.set(false)),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--presentation--regular', hue: 'orange' }),
    Annotation.UserType.set({}),
  ),
) {}

const clampIndex = (index: number | undefined, length: number): number =>
  index === undefined ? length : Math.max(0, Math.min(index, length));

/**
 * Creates a presentation with one owned `Text` section per slide string.
 */
export const make = ({ name, slides = [] }: { name?: string; slides?: string[] } = {}): Presentation => {
  const texts = slides.map((content) => Text.make({ content }));
  const presentation = Obj.make(Presentation, { name, sections: texts.map((text) => Ref.make(text)) });
  // Parent is set after the refs exist because setParent warns when the parent holds no ref.
  for (const text of texts) {
    Obj.setParent(text, presentation);
  }
  return presentation;
};

/**
 * Whether the target is an owned slide, read from its parent so one array keeps the order.
 */
export const isOwned = (presentation: Presentation, target: Obj.Unknown): boolean =>
  Obj.instanceOf(Text.Text, target) && Obj.getParent(target)?.id === presentation.id;

/**
 * Inserts a new owned slide at the index (default: append).
 */
export const addSlide = (presentation: Presentation, content: string, index?: number): Text.Text => {
  const text = Text.make({ content });
  Obj.update(presentation, (presentation) => {
    presentation.sections.splice(clampIndex(index, presentation.sections.length), 0, Ref.make(text));
  });
  Obj.setParent(text, presentation);
  return text;
};

/**
 * Links an existing object as a section without taking ownership; no-op if already a section.
 */
export const link = (presentation: Presentation, object: Obj.Unknown, index?: number): void => {
  if (presentation.sections.some(Ref.hasEntityId(object.id))) {
    return;
  }
  Obj.update(presentation, (presentation) => {
    presentation.sections.splice(clampIndex(index, presentation.sections.length), 0, Ref.make(object));
  });
};

/**
 * Removes the section; an owned target is also deleted from its database, a linked one is only unlinked.
 */
export const remove = (presentation: Presentation, target: Obj.Unknown): void => {
  const index = presentation.sections.findIndex(Ref.hasEntityId(target.id));
  if (index < 0) {
    return;
  }
  const owned = isOwned(presentation, target);
  Obj.update(presentation, (presentation) => {
    presentation.sections.splice(index, 1);
  });
  if (owned) {
    Obj.getDatabase(target)?.remove(target);
  }
};

/**
 * Moves the section at `from` to `to`.
 */
export const move = (presentation: Presentation, from: number, to: number): void => {
  Obj.update(presentation, (presentation) => {
    if (from < 0 || from >= presentation.sections.length) {
      return;
    }
    // A fresh ref is required because a ref already held by the array fails validation on re-insert.
    const section = Ref.fromURI(presentation.sections[from].uri);
    presentation.sections.splice(from, 1);
    presentation.sections.splice(clampIndex(to, presentation.sections.length), 0, section);
  });
};
