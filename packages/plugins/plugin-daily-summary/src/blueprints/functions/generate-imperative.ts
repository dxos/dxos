//
// Copyright 2026 DXOS.org
//

import { type Space } from '@dxos/client/echo';
import { Collection, Filter, Obj, Query, Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';

const DEFAULT_LOOKBACK_HOURS = 24;
const SUMMARIES_COLLECTION_NAME = 'Summaries';
const SUMMARY_TITLE_PREFIX = 'Daily Summary —';
const MARKDOWN_DOC_TYPENAME = 'org.dxos.type.document';

/**
 * Imperatively generate a daily summary in the given space.
 * Used by the settings UI "Generate Now" button.
 * Uses template-based formatting (no AI). Updates existing same-day summary if found.
 */
export const generateSummaryInSpace = async (space: Space) => {
  await space.waitUntilReady();
  const db = space.db;

  const cutoff = Date.now() - DEFAULT_LOOKBACK_HOURS * 60 * 60 * 1000;
  const now = new Date();
  const dateLabel = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const docName = `${SUMMARY_TITLE_PREFIX} ${dateLabel}`;

  const recentObjects = await db.query(Filter.updated({ after: cutoff })).run();

  const byType = new Map<string, string[]>();
  for (const obj of recentObjects) {
    const name = (obj as any).name ?? (obj as any).title ?? 'unnamed';
    const typeName = Obj.getTypename(obj) ?? 'unknown';
    const list = byType.get(typeName) ?? [];
    list.push(name);
    byType.set(typeName, list);
  }

  const statsBreakdown = [...byType.entries()].map(([type, items]) => `${items.length} ${type}`).join(', ');

  const highlights = [...byType.entries()]
    .slice(0, 4)
    .map(([type, items]) => `- Worked on ${items.length} ${type} item${items.length > 1 ? 's' : ''}`);

  const categoryBlocks = [...byType.entries()].map(([type, items]) => {
    const itemList = items.map((n) => `  - ${n}`).join('\n');
    return `### ${type}\n${itemList}`;
  });

  const content = [
    '## Highlights',
    ...highlights,
    '',
    '## Activity by Category',
    ...categoryBlocks,
    '',
    '## Statistics',
    `- Total objects modified: ${recentObjects.length}`,
    `- Breakdown: ${statsBreakdown}`,
    `- Time window: last ${DEFAULT_LOOKBACK_HOURS} hours`,
  ].join('\n');

  const existingDoc = await findExistingDoc(db, docName);

  if (existingDoc) {
    await updateDocContent(existingDoc, content);
  } else {
    const text = Text.make(content);
    const doc = db.add({ name: docName, content: Ref.make(text) } as any);
    Obj.setParent(text, doc);

    const collection = await findOrCreateCollection(db);
    Obj.change(collection, (c: any) => {
      c.objects.push(Ref.make(doc));
    });
  }

  return {
    objectCount: recentObjects.length,
    date: dateLabel,
  };
};

const findExistingDoc = async (db: any, docName: string) => {
  const docs = await db.query(Filter.typename(MARKDOWN_DOC_TYPENAME)).run();
  return docs.find((d: any) => d.name === docName) ?? null;
};

const updateDocContent = async (doc: any, content: string) => {
  const textRef = doc.content;
  if (textRef && Ref.isRef(textRef)) {
    const text = await textRef.load();
    if (text) {
      text.content = content;
      return;
    }
  }
  doc.content = Ref.make(Text.make(content));
};

const findOrCreateCollection = async (db: any) => {
  const collections = await db.query(Query.type(Collection.Collection, { name: SUMMARIES_COLLECTION_NAME })).run();

  if (collections.length > 0) {
    return collections[0];
  }

  return db.add(Collection.make({ name: SUMMARIES_COLLECTION_NAME }));
};
