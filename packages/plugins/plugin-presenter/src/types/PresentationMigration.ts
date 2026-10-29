//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Migration, Obj, Ref, Type } from '@dxos/echo';
import { Text } from '@dxos/schema';

import { applyEdit, isHiddenSlide, setFrontmatter } from '../markdown/edit.ts';
import { Presentation, Slide } from './Presentation.ts';

/** `org.dxos.type.presentation@0.1.0`: sections held directly, an owned `Text` parented to the presentation. */
export class LegacyPresentation extends Type.makeObject<LegacyPresentation>(
  DXN.make('org.dxos.type.presentation', '0.1.0'),
)(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    sections: Schema.Array(Ref.Ref(Obj.Unknown)),
    theme: Schema.optional(Schema.Any),
  }),
) {}

/** Each migrated presentation's new slides, from `transform` to `onMigration`, which parents them. */
const pending = new Map<string, Slide[]>();

/**
 * `org.dxos.type.presentation` 0.1.0 -> 0.2.0: each section becomes a `Slide` showing it. An owned `Text` moves under
 * its slide, and its frontmatter `hide: true` becomes the slide's `hidden`.
 */
export const presentationMigration = Migration.define({
  from: LegacyPresentation,
  to: Presentation,
  transform: async (from, { db }) => {
    const slides: Slide[] = [];
    for (const ref of from.sections) {
      const content = ref.target ?? (await ref.tryLoad());
      if (!content || Obj.isDeleted(content)) {
        continue;
      }
      const owned = Obj.instanceOf(Text.Text, content) && Obj.getParent(content)?.id === from.id;
      const hidden = owned && isHiddenSlide(content.content);
      if (hidden) {
        const markdown = content.content;
        Obj.update(content, (content) => {
          content.content = applyEdit(markdown, setFrontmatter(markdown, { hide: undefined }));
        });
      }
      slides.push(db.add(Obj.make(Slide, { content: Ref.make(content), ...(hidden ? { hidden: true } : {}) })));
    }
    pending.set(from.id, slides);
    const { sections: _sections, ...rest } = from;
    return { ...rest, slides: slides.map((slide) => Ref.make(slide)) };
  },
  onMigration: async ({ object }) => {
    for (const slide of pending.get(object.id) ?? []) {
      Obj.setParent(slide, object);
      const content = slide.content.target;
      // An owned Text moves from the presentation to its slide; a linked object keeps its own parent.
      if (content && Obj.instanceOf(Text.Text, content) && Obj.getParent(content)?.id === object.id) {
        Obj.setParent(content, slide);
      }
    }
    pending.delete(object.id);
  },
});
