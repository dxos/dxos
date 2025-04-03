import { defineTool, Message, TextContentBlock } from '@dxos/artifact';
import { AIServiceEdgeClient, MixedStreamParser, OllamaClient } from '@dxos/assistant';
import { AI_SERVICE_ENDPOINT } from '@dxos/assistant/testing';
import { isEncodedReference } from '@dxos/echo-protocol';
import { createStatic, getObjectAnnotation, ObjectId, Ref, S } from '@dxos/echo-schema';
import { mapAst } from '@dxos/effect';
import { assertArgument, invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Testing } from '@dxos/schema/testing';
import { deepMapValues } from '@dxos/util';
import { Option, type SchemaAST } from 'effect';
import { getIdentifierAnnotation } from 'effect/SchemaAST';
import Exa, { type BaseSearchOptions } from 'exa-js';
import { describe, test } from 'vitest';

const exa = new Exa('9c7e17ff-0c85-4cd5-827a-8b489f139e03');
// const ai = new AIServiceEdgeClient({
//   endpoint: AI_SERVICE_ENDPOINT.REMOTE,
// });

const ai = new OllamaClient({
  overrides: {
    model: 'llama3.1:8b',
  },
});

describe('Exa Search', () => {
  test.skip('contacts', { timeout: 60_000 }, async () => {
    const objects = await search({
      query: 'top executives at google',
      schema: [Testing.ContactType],
    });

    log.info('result', { objects });
  });

  test.skip('contacts projects and orgs', { timeout: 60_000 }, async () => {
    const objects = await search({
      query: 'top executives at google',
      schema: [Testing.ContactType, Testing.ProjectType, Testing.OrgType],
    });

    log.info('result', { objects });
  });

  test('a19z org, projects they invest in and team', { timeout: 60_000 }, async () => {
    const objects = await search({
      query: 'a19z org, projects they invest in and team',
      schema: [Testing.ProjectType, Testing.OrgType, Testing.ContactType],
    });

    console.log(JSON.stringify(objects, null, 2));
  });

  test('companies building CRDTs', { timeout: 60_000 }, async () => {
    const objects = await search({
      query: 'companies building CRDTs',
      schema: [Testing.ProjectType, Testing.OrgType, Testing.ContactType],
    });

    console.log(JSON.stringify(objects, null, 2));
  });

  // test.only('exa crawl', { timeout: 60_000 }, async () => {
  //   const result = await exa.getContents('https://dxos.org', {
  //     livecrawl: 'always',

  //     text: {
  //       maxCharacters: 10_000,

  //     },
  //     highlights: {
  //       query: 'dxos org, team and projects',
  //       numSentences: 10,
  //     },
  //   });

  //   log.info('result', { result });
  // });
});

type SearchOptions<Schema extends S.Schema.AnyNoContext> = {
  query?: string;

  // TODO(dmaretskyi): How can we pass this through.
  context?: string;

  schema: Schema[];

  liveCrawl?: boolean;
};

const search = async <Schema extends S.Schema.AnyNoContext>(
  options: SearchOptions<Schema>,
): Promise<S.Schema.Type<Schema>[]> => {
  assertArgument(options.query || options.context, 'query or context is required');
  invariant(options.context == null, 'context not supported');
  invariant(options.query);

  const mappedSchema = options.schema.map(mapSchemaRefs);

  const context = await exa.searchAndContents(options.query!, {
    type: 'keyword',
    text: {
      maxCharacters: 3_000,
    },
    livecrawl: options.liveCrawl ? 'always' : undefined,
  });

  const result = await new MixedStreamParser().parse(
    await ai.exec({
      model: '@anthropic/claude-3-5-haiku-20241022',
      systemPrompt: `Using the following context, answer the search query, return data in the structured format by calling submit_result tool with the right schema. The query: ${options.query}`,
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

  const objects = mappedSchema.flatMap((s, i) => {
    return ((result[0].content.find((c) => c.type === 'tool_use')?.input as any)[`objects_${i}`] as unknown[]).map(
      (object) => ({ data: mappedSchema[i].pipe(S.decodeUnknownSync)(object), schema: options.schema[i] }),
    );
  });

  return sanitizeObjects(objects);
};

const sanitizeObjects = (objects: { data: any; schema: S.Schema.AnyNoContext }[]) => {
  const idMap = new Map<string, string>();

  return objects
    .map((x) => {
      idMap.set(x.data.id, ObjectId.random());
      x.data.id = idMap.get(x.data.id);
      return x;
    })
    .map((x) => {
      const data = deepMapValues(x.data, (value, recurse) => {
        if (isEncodedReference(value)) {
          // TODO(dmaretskyi): Whats the best way to represent a local url.
          return { '/': `dxn:echo:@:${idMap.get(value['/'])}` };
        }

        return recurse(value);
      });
      return createStatic(x.schema, data);
    });
};

describe.skip('schema', () => {
  test('mapSchemaRefs', () => {
    const schema = mapSchemaRefs(Testing.ContactType);
    log.info('schema', { schema });
  });
});

const SoftRef = S.Struct({
  '/': S.String,
}).annotations({
  description: 'Reference to another object using its unique id',
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
