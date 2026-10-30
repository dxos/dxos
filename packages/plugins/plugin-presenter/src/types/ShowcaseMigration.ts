//
// Copyright 2026 DXOS.org
//

import { Migration, Obj, Ref } from '@dxos/echo';
import * as LegacyShowcase from '@dxos/plugin-projects/LegacyShowcase';
import { Text } from '@dxos/schema';

import { Presentation, Slide } from './Presentation.ts';

/**
 * plugin-projects' `org.dxos.type.showcase@0.1.0` → `Presentation`: its markdown becomes the first slide and each
 * artifact a linked slide after it. The object keeps its id, so the `Demonstrates` edges from it still hold. The new
 * slides pass from `transform` to `onMigration` in this migration's own closure.
 */
export const makeShowcaseMigration = (): Migration.ObjectMigration => {
  /** Each migrated showcase's new slides, from `transform` to `onMigration`, which parents them. */
  const pending = new Map<string, Slide[]>();
  return Migration.define({
    from: LegacyShowcase.Showcase,
    to: Presentation,
    transform: async (from, { db }) => {
      // Every ref resolves before any slide is added, so a load that fails leaves nothing behind to duplicate on retry.
      const content = from.content.target ?? (await from.content.tryLoad());
      const artifacts = await Promise.all(from.artifacts.map((ref) => ref.target ?? ref.tryLoad()));
      const contents = [content, ...artifacts].filter(
        (object, index, all): object is NonNullable<typeof object> =>
          object !== undefined && !Obj.isDeleted(object) && all.findIndex((other) => other?.id === object.id) === index,
      );
      const slides = contents.map((object) => db.add(Obj.make(Slide, { content: Ref.make(object) })));
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
};
