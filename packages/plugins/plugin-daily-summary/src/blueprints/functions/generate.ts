//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Effect from 'effect/Effect';

import { Collection, Database, Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { Text } from '@dxos/schema';
import { CollectionModel } from '@dxos/schema';

import { GenerateSummary } from './definitions';

const DEFAULT_LOOKBACK_HOURS = 24;
const SUMMARIES_COLLECTION_NAME = 'Summaries';

/**
 * Minimal schema matching `org.dxos.type.document` from plugin-markdown.
 * Avoids importing plugin-markdown/types which pulls in browser-only ui-editor deps.
 */
const MarkdownDocument = Schema.Struct({
  name: Schema.optional(Schema.String),
  content: Ref.Ref(Text.Text),
}).pipe(Type.object({ typename: 'org.dxos.type.document', version: '0.1.0' }));

const makeMarkdownDoc = ({ name, content }: { name: string; content: string }) => {
  const doc = Obj.make(MarkdownDocument, { name, content: Ref.make(Text.make(content)) });
  Obj.setParent(doc.content.target!, doc);
  return doc;
};

export default GenerateSummary.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ previousSummary, lookbackHours }) {
      const hours = lookbackHours ?? DEFAULT_LOOKBACK_HOURS;
      const cutoff = Date.now() - hours * 60 * 60 * 1000;
      const today = new Date().toISOString().slice(0, 10);

      const recentObjects = yield* Database.runQuery(
        Query.type(Obj.Unknown).select(Filter.updated({ after: cutoff })),
      );

      const objectDescriptions = recentObjects.map((obj) => {
        const name = (obj as any).name ?? (obj as any).title ?? Obj.getDXN(obj).toString();
        const typeName = Obj.getTypename(obj) ?? 'unknown';
        return `- [${typeName}] ${name}`;
      });

      const content = buildSummaryContent({ date: today, objectDescriptions, previousSummary });
      const doc = makeMarkdownDoc({ name: `Daily Summary — ${today}`, content });

      const summariesCollection = yield* findOrCreateSummariesCollection();
      yield* CollectionModel.add({ object: doc, target: summariesCollection });

      return {
        id: Obj.getDXN(doc).toString(),
        objectCount: recentObjects.length,
        date: today,
      };
    }),
  ),
);

const findOrCreateSummariesCollection = Effect.fn(function* () {
  const collections = yield* Database.runQuery(
    Query.type(Collection.Collection, { name: SUMMARIES_COLLECTION_NAME }),
  );

  if (collections.length > 0) {
    return collections[0];
  }

  const collection = Collection.make({ name: SUMMARIES_COLLECTION_NAME });
  yield* CollectionModel.add({ object: collection });
  return collection;
});

const buildSummaryContent = ({
  date,
  objectDescriptions,
  previousSummary,
}: {
  date: string;
  objectDescriptions: string[];
  previousSummary?: string;
}): string => {
  const lines = [
    `# Daily Summary — ${date}`,
    '',
    `**${objectDescriptions.length}** objects were modified today:`,
    '',
    ...objectDescriptions,
  ];

  if (previousSummary) {
    lines.push('', '---', '', '## Previous Summary', '', previousSummary);
  }

  return lines.join('\n');
};
