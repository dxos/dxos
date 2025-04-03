import { defineTool, Message, TextContentBlock } from '@dxos/artifact';
import { MixedStreamParser, type AIServiceClient } from '@dxos/assistant';
import { isEncodedReference } from '@dxos/echo-protocol';
import { createStatic, getObjectAnnotation, ObjectId, Ref, S } from '@dxos/echo-schema';
import { mapAst } from '@dxos/effect';
import { assertArgument, invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { deepMapValues } from '@dxos/util';
import { Option } from 'effect';
import { getIdentifierAnnotation } from 'effect/SchemaAST';
import Exa from 'exa-js';

export type SearchOptions<Schema extends S.Schema.AnyNoContext> = {
  query?: string;

  // TODO(dmaretskyi): How can we pass this through.
  context?: string;

  schema: Schema[];

  aiService: AIServiceClient;
  exaApiKey: string;

  liveCrawl?: boolean;
};

export type SearchResult<T = unknown> = {
  data: T[];
  metrics: {
    sourceQueryTime: number;
    dataExtractionTime: number;
  };
};

export const search = async <Schema extends S.Schema.AnyNoContext>(
  options: SearchOptions<Schema>,
): Promise<SearchResult<S.Schema.Type<Schema>>> => {
  assertArgument(options.query || options.context, 'query or context is required');
  invariant(options.context == null, 'context not supported');
  invariant(options.query);

  const mappedSchema = options.schema.map(mapSchemaRefs);

  let startTime = performance.now();

  const exa = new Exa(options.exaApiKey);
  const context = await exa.searchAndContents(options.query!, {
    type: 'keyword',
    text: {
      maxCharacters: 3_000,
    },
    livecrawl: options.liveCrawl ? 'always' : undefined,
  });

  const sourceQueryTime = performance.now() - startTime;

  startTime = performance.now();
  const result = await new MixedStreamParser().parse(
    await options.aiService.exec({
      model: '@anthropic/claude-3-5-haiku-20241022',
      systemPrompt: DATA_EXTRACTION_INSTRUCTIONS + `\n\nThe query: ${options.query}`,
      history: [
        createStatic(Message, {
          role: 'user',

          content: context.results.map(
            (r): TextContentBlock => ({
              type: 'text',
              text: `# ${r.title}\n\n${r.text}`,
            }),
          ),
        }),
      ],
      tools: [
        defineTool('submit_result', {
          name: 'submit_result',
          description: 'Submit the result',
          schema: S.Struct({
            ...Object.fromEntries(
              mappedSchema.map((s, index) => [
                `objects_${index}`,
                S.Array(s).annotations({
                  description: `The objects to answer the query of type ${getObjectAnnotation(s)?.typename ?? getIdentifierAnnotation(s.ast).pipe(Option.getOrNull)}`,
                }),
              ]),
            ),
          }),
          execute: async ({ objects }) => {
            throw new Error('Not implemented');
          },
        }),
      ],
    }),
  );

  const dataExtractionTime = performance.now() - startTime;

  const rawObjects = Object.values(result[0].content.find((c) => c.type === 'tool_use')?.input as any);

  log.info('rawObjects', { rawObjects });

  const entries = mappedSchema.flatMap((schema, i) => {
    return (rawObjects[i] as any[]).map((object: any) => ({
      data: schema.pipe(S.decodeUnknownSync)(object),
      schema: options.schema[i],
    }));
  });

  log.info('verified objects', { entries });

  return {
    data: sanitizeObjects(entries),
    metrics: {
      sourceQueryTime,
      dataExtractionTime,
    },
  };
};

const DATA_EXTRACTION_INSTRUCTIONS = `
  Using the following context, answer the search query.
  Return data in the structured format by calling submit_result tool with the right schema.

  Reference handling:
    - Provide an exact id of an object you are referencing.
    - If the object is not found, provide a search query to find it.
    - Prefer using ids when available.
`;

const sanitizeObjects = (entries: { data: any; schema: S.Schema.AnyNoContext }[]) => {
  const idMap = new Map<string, string>();

  return entries
    .map((entry) => {
      idMap.set(entry.data.id, ObjectId.random());
      entry.data.id = idMap.get(entry.data.id);
      return entry;
    })
    .map((entry) => {
      const data = deepMapValues(entry.data, (value, recurse) => {
        if (isEncodedReference(value)) {
          const ref = value['/'];
          if (idMap.has(ref)) {
            // TODO(dmaretskyi): Whats the best way to represent a local url.
            return { '/': `dxn:echo:@:${idMap.get(ref)}` };
          } else {
            // Search URIs?
            return { '/': `search:?q=${encodeURIComponent(ref)}` };
          }
        }

        return recurse(value);
      });

      return createStatic(entry.schema, data);
    });
};

const SoftRef = S.Struct({
  '/': S.String,
}).annotations({
  description: 'Reference to another object',
});

const mapSchemaRefs = (schema: S.Schema.AnyNoContext) => {
  return S.make(
    mapAst(schema.ast, function mapper(ast, key) {
      if (getIdentifierAnnotation(ast).pipe(Option.getOrNull) === Ref.schemaIdentifier) {
        return SoftRef.ast;
      }

      return mapAst(ast, mapper);
    }),
  );
};
