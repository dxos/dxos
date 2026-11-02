//
// Copyright 2026 DXOS.org
//

import { Filter, Obj, Query, Relation } from '@dxos/echo';
import { getRangeFromCursor, toCursorRange } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { type Text } from '@dxos/schema';
import { AnchoredTo, type Thread } from '@dxos/types';

/** A Markdown thread's anchor and the document text before an agent turn. */
export type AnchorSnapshot = {
  relation: AnchoredTo.AnchoredTo;
  text: Text.Text;
  before: string;
};

/** Records a thread's text anchor before an agent turn; undefined for a subject without one. */
export const snapshotAnchor = async (
  thread: Thread.Thread,
  subject: Obj.Unknown,
): Promise<AnchorSnapshot | undefined> => {
  const db = Obj.getDatabase(thread);
  if (!db || !Obj.instanceOf(Markdown.Document, subject)) {
    return undefined;
  }
  const relations: AnchoredTo.AnchoredTo[] = await db
    .query(Query.select(Filter.id(thread.id)).sourceOf(AnchoredTo.AnchoredTo))
    .run();
  const relation = relations.find((relation) => Relation.getTarget(relation).id === subject.id);
  if (!relation?.anchor) {
    return undefined;
  }
  const text = await subject.content.load();
  return { relation, text, before: text.content };
};

/**
 * Keeps the comment on the text an edit put in place of its range. An edit that replaces the anchored text (a
 * translation) deletes everything the range's cursors stood on, so they collapse to a point; the anchor is then moved
 * to the region that changed, between the text the edit left alone on either side.
 */
export const restoreAnchor = ({ relation, text, before }: AnchorSnapshot): void => {
  const after = text.content;
  const accessor = Doc.createAccessor(text, ['content']);
  const range = relation.anchor ? getRangeFromCursor(accessor, relation.anchor) : undefined;
  if (after === before || (range && range.end > range.start)) {
    return;
  }

  let prefix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) {
    prefix++;
  }
  let suffix = 0;
  while (
    suffix < before.length - prefix &&
    suffix < after.length - prefix &&
    before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
  ) {
    suffix++;
  }
  const end = after.length - suffix;
  if (end > prefix) {
    Relation.update(relation, (relation) => {
      relation.anchor = toCursorRange(accessor, prefix, end);
    });
  }
};
