//
// Copyright 2026 DXOS.org
//

import { Migration, Obj, Ref } from '@dxos/echo';
import * as LegacyShowcase from '@dxos/plugin-projects/LegacyShowcase';
import { Text } from '@dxos/schema';

import { Presentation, Slide } from './Presentation.ts';

/** Each migrated showcase's new slides, from `transform` to `onMigration`, which parents them. */
const pending = new Map<string, Slide[]>();

/**
 * plugin-projects' `org.dxos.type.showcase@0.1.0` → `Presentation`: its markdown becomes the first slide and each
 * artifact a linked slide after it. The object keeps its id, so the `Demonstrates` edges from it still hold.
 */
export const showcaseMigration = Migration.define({
  from: LegacyShowcase.Showcase,
  to: Presentation,
  transform: async (from, { db }) => {
    const slides: Slide[] = [];
    const content = from.content.target ?? (await from.content.tryLoad());
    if (content && !Obj.isDeleted(content)) {
      slides.push(db.add(Obj.make(Slide, { content: Ref.make(content) })));
    }
    for (const ref of from.artifacts) {
      const artifact = ref.target ?? (await ref.tryLoad());
      if (artifact && !Obj.isDeleted(artifact) && !slides.some((slide) => slide.content.target?.id === artifact.id)) {
        slides.push(db.add(Obj.make(Slide, { content: Ref.make(artifact) })));
      }
    }
    pending.set(from.id, slides);
    return { name: from.name, slides: slides.map((slide) => Ref.make(slide)) };
  },
  onMigration: async ({ object }) => {
    for (const slide of pending.get(object.id) ?? []) {
      Obj.setParent(slide, object);
      const content = slide.content.target;
      // The write-up moves from the showcase to its slide; a linked artifact keeps its own parent.
      if (content && Obj.instanceOf(Text.Text, content) && Obj.getParent(content)?.id === object.id) {
        Obj.setParent(content, slide);
      }
    }
    pending.delete(object.id);
  },
});
