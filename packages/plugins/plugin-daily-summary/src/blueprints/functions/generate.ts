//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from '@effect/ai/LanguageModel';
import * as Prompt from '@effect/ai/Prompt';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { AiService, ToolExecutionService, ToolResolverService } from '@dxos/ai';
import { Collection, Database, Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import { FunctionInvocationService, TracingService } from '@dxos/functions';
import { Operation } from '@dxos/operation';
import { Text } from '@dxos/schema';
import { CollectionModel } from '@dxos/schema';

import { SUMMARY_STRUCTURE } from '../daily-summary-blueprint';
import { GenerateSummary } from './definitions';

const DEFAULT_LOOKBACK_HOURS = 24;
const SUMMARIES_COLLECTION_NAME = 'Summaries';
const SUMMARY_TITLE_PREFIX = 'Daily Summary —';

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
    Effect.fnUntraced(
      function* ({ previousSummary, lookbackHours }) {
        const hours = lookbackHours ?? DEFAULT_LOOKBACK_HOURS;
        const cutoff = Date.now() - hours * 60 * 60 * 1000;
        const now = new Date();
        const dateLabel = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
        const docName = `${SUMMARY_TITLE_PREFIX} ${dateLabel}`;

        const recentObjects = yield* Database.runQuery(Filter.updated({ after: cutoff }));

        const objectDescriptions = recentObjects.map((obj) => {
          const name = (obj as any).name ?? (obj as any).title ?? Obj.getDXN(obj).toString();
          const typeName = Obj.getTypename(obj) ?? 'unknown';
          return `- [${typeName}] ${name}`;
        });

        const content = yield* summarizeWithAi({
          dateLabel,
          objectDescriptions,
          previousSummary,
          hours,
        });

        const existingDoc = yield* findExistingDaySummary(docName);

        let doc;
        if (existingDoc) {
          yield* updateDocContent(existingDoc, content);
          doc = existingDoc;
        } else {
          doc = makeMarkdownDoc({ name: docName, content });
          const summariesCollection = yield* findOrCreateSummariesCollection();
          yield* CollectionModel.add({ object: doc, target: summariesCollection });
        }

        return {
          id: Obj.getDXN(doc).toString(),
          objectCount: recentObjects.length,
          date: dateLabel,
        };
      },
      Effect.provide(
        Layer.mergeAll(
          AiService.model('@anthropic/claude-haiku-4-5'),
          ToolResolverService.layerEmpty,
          ToolExecutionService.layerEmpty,
          TracingService.layerNoop,
          FunctionInvocationService.layerNotAvailable,
        ),
      ),
    ),
  ),
);

const summarizeWithAi = Effect.fn(function* ({
  dateLabel,
  objectDescriptions,
  previousSummary,
  hours,
}: {
  dateLabel: string;
  objectDescriptions: string[];
  previousSummary?: string;
  hours: number;
}) {
  const userContent = [
    `Date: ${dateLabel}`,
    `Time window: last ${hours} hours`,
    `Total objects modified: ${objectDescriptions.length}`,
    '',
    'Modified objects:',
    ...objectDescriptions,
    ...(previousSummary ? ['', 'Previous summary for context:', previousSummary] : []),
  ].join('\n');

  const { text } = yield* LanguageModel.generateText({
    prompt: Prompt.fromMessages([
      Prompt.systemMessage({ content: SUMMARY_STRUCTURE }),
      Prompt.userMessage({ content: [Prompt.makePart('text', { text: userContent })] }),
    ]),
  });

  return text;
});

const findExistingDaySummary = Effect.fn(function* (docName: string) {
  const docs = yield* Database.runQuery(Query.type(MarkdownDocument, { name: docName }));
  return docs.length > 0 ? docs[0] : null;
});

const updateDocContent = Effect.fn(function* (doc: any, newContent: string) {
  const textRef = doc.content;
  if (textRef && Ref.isRef(textRef)) {
    const text: any = yield* Effect.promise(() => textRef.load());
    if (text) {
      Obj.change(text, (t: any) => {
        t.content = newContent;
      });
      return;
    }
  }
  Obj.change(doc, (d: any) => {
    d.content = Ref.make(Text.make(newContent));
  });
});

const findOrCreateSummariesCollection = Effect.fn(function* () {
  const collections = yield* Database.runQuery(Query.type(Collection.Collection, { name: SUMMARIES_COLLECTION_NAME }));

  if (collections.length > 0) {
    return collections[0];
  }

  const collection = Collection.make({ name: SUMMARIES_COLLECTION_NAME });
  yield* CollectionModel.add({ object: collection });
  return collection;
});
