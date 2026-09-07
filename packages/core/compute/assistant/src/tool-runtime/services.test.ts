//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import * as AnthropicStructuredOutput from 'effect/unstable/ai/AnthropicStructuredOutput';
import * as Tool from 'effect/unstable/ai/Tool';
import { describe, test } from 'vitest';

import { OpaqueToolkit, ToolId, ToolResolverService } from '@dxos/ai';
import * as Operation from '@dxos/compute/Operation';
import { Obj, Ref, Registry } from '@dxos/echo';
import { makeRegistry } from '@dxos/echo-client';
import { EffectEx } from '@dxos/effect';
import { DXN, EID, EntityId, SpaceId } from '@dxos/keys';

import {
  createStructFieldsFromSchema,
  isHandlerLike,
  makeToolResolverFromOperations,
  projectFunctionToTool,
} from './services';

describe('createStructFieldsFromSchema', () => {
  const SPACE = SpaceId.random();
  const OBJECT = EntityId.random();

  // Projects a tool input schema for the LLM and decodes the given `in` value the way a tool call would.
  const decodeIn = (schema: Schema.Codec<unknown, unknown>, value: unknown) => {
    const fields = createStructFieldsFromSchema(schema);
    const decoded: any = Schema.decodeUnknownSync(Schema.Struct(fields))({ in: value });
    return decoded.in;
  };

  // An LLM-supplied ref URI string must coerce to a valid local EID. Refs nested inside an optional
  // field surface as a `T | undefined` union; the projection must still route them through the
  // LLM-friendly coercion so a qualified URI does not become a malformed `echo:////…`.
  test('coerces refs passed as qualified URI strings inside an optional array', ({ expect }) => {
    const refs = decodeIn(Schema.Struct({ in: Schema.optional(Schema.Array(Ref.Ref(Obj.Unknown))) }), [
      `echo://${SPACE}/${OBJECT}`,
    ]);
    expect(refs).toHaveLength(1);
    expect(() => EID.parse(refs[0].uri)).not.toThrow();
    expect(refs[0].uri).toBe(`echo:///${OBJECT}`);
  });

  test('coerces refs passed as qualified URI strings inside a required array', ({ expect }) => {
    const refs = decodeIn(Schema.Struct({ in: Schema.Array(Ref.Ref(Obj.Unknown)) }), [`echo://${SPACE}/${OBJECT}`]);
    expect(refs).toHaveLength(1);
    expect(refs[0].uri).toBe(`echo:///${OBJECT}`);
  });

  // Optionality rides on the AST node's `context` in v4, and the projection rebuilds any node that
  // contains a ref. Dropping the context makes the key required, so a model that legitimately omits
  // the parameter gets its tool call rejected with `Missing key`.
  test('a ref-bearing optional field stays optional when omitted', ({ expect }) => {
    const fields = createStructFieldsFromSchema(
      Schema.Struct({ in: Schema.optional(Schema.Array(Ref.Ref(Obj.Unknown))) }),
    );
    const decoded: any = Schema.decodeUnknownSync(Schema.Struct(fields))({});
    expect(decoded.in).toBeUndefined();
  });

  test('a ref-bearing optional field is not advertised as required to the model', ({ expect }) => {
    const fields = createStructFieldsFromSchema(
      Schema.Struct({
        in: Schema.optional(Schema.Array(Ref.Ref(Obj.Unknown))),
        obj: Schema.optional(Ref.Ref(Obj.Unknown)),
        // `optionalKey` puts the modifier directly on the ref node rather than behind a
        // `T | undefined` union, so the ref rewrite itself has to carry the context across.
        bare: Schema.optionalKey(Ref.Ref(Obj.Unknown)),
        text: Schema.optional(Schema.String),
        required: Schema.String,
      }),
    );
    const { schema } = Schema.toJsonSchemaDocument(Schema.Struct(fields));
    expect(schema.required).toEqual(['required']);
  });
});

describe('projectFunctionToTool', () => {
  /** Reports every `type: 'object'` node that omits `additionalProperties`, which strict mode rejects. */
  const strictOffenders = (node: unknown, path: string[] = []): string[] => {
    if (Array.isArray(node)) {
      return node.flatMap((item, index) => strictOffenders(item, [...path, String(index)]));
    }
    if (typeof node !== 'object' || node === null) {
      return [];
    }
    const entries = Object.entries(node as Record<string, unknown>);
    const isObjectNode = entries.some(([key, value]) => key === 'type' && value === 'object');
    const declaresAdditional = entries.some(([key]) => key === 'additionalProperties');
    return [
      ...(isObjectNode && !declaresAdditional ? [path.join('.') || '<root>'] : []),
      ...entries.flatMap(([key, value]) => strictOffenders(value, [...path, key])),
    ];
  };

  // A provider's strict tool mode requires `additionalProperties` on every object node, and one
  // non-conforming tool rejects the ENTIRE request (all tools are sent together) with
  // "For 'object' type, 'additionalProperties' must be explicitly set to false". v4 emits an empty
  // struct as `{anyOf: [{type:'object'}, {type:'array'}]}`, whose object branch omits it — so a
  // single parameterless operation would break every agent request.
  test('a parameterless operation emits a schema that satisfies strict mode', ({ expect }) => {
    const Parameterless = Operation.make({
      meta: { key: DXN.make('com.example.operation.test.noParams') },
      input: Schema.Void,
      output: Schema.Void,
    });

    const emitted = Tool.getJsonSchema(projectFunctionToTool(Parameterless));
    expect(strictOffenders(emitted)).toEqual([]);
    expect(emitted.type).toBe('object');
  });

  // `Schema.Void` does not survive the registry round trip: `Operation.serialize` renders it through
  // JSON Schema as `{type: 'null'}` and `deserialize` reads that back as `Schema.Null`, while an
  // operation persisted without an `inputSchema` reads back as `Schema.Unknown`. Neither tag is the
  // one the operation was authored with, and an unhandled tag threw — failing not just this tool but
  // every agent request that offered it, since all tools are sent together.
  for (const [name, input] of [
    ['void', Schema.Void],
    ['null (a round-tripped void)', Schema.Null],
    ['unknown (persisted without an input schema)', Schema.Unknown],
  ] as const) {
    test(`a no-input operation projects to empty parameters: ${name}`, ({ expect }) => {
      const NoInput = Operation.make({
        meta: { key: DXN.make('com.example.operation.test.noInput') },
        input,
        output: Schema.Void,
      });

      expect(createStructFieldsFromSchema(input)).toEqual({});
      const emitted = Tool.getJsonSchema(projectFunctionToTool(NoInput));
      expect(emitted.type).toBe('object');
      expect(strictOffenders(emitted)).toEqual([]);
    });
  }

  // The projection is the last line of defence, so a genuinely unprojectable input still throws —
  // `makeToolResolverFromOperations` catches that and drops the single tool.
  test('an input that is neither a struct nor empty still fails', ({ expect }) => {
    expect(() => createStructFieldsFromSchema(Schema.String)).toThrow(/Unsupported schema AST: String/);
  });

  // An operation taking arbitrary JSON cannot be described under a provider's strict mode: the value
  // slot emits the empty schema, which Anthropic rejects ("Empty schema ({}) that accepts any JSON
  // value is not supported"). Strict is therefore off for projected operations — re-enabling it makes
  // every request fail, since all tools are sent together.
  test('an operation taking arbitrary JSON is not advertised as strict', ({ expect }) => {
    const PropertyBag = Operation.make({
      meta: { key: DXN.make('com.example.operation.test.propertyBag') },
      input: Schema.Struct({ properties: Schema.Record(Schema.String, Schema.Any) }),
      output: Schema.Void,
    });

    expect(Tool.getStrictMode(projectFunctionToTool(PropertyBag))).toBe(false);
  });

  // What the model is told must match what we validate. rc.108 breaks that for an Effect-schema tool:
  // it describes the tool through the provider's structured-output codec (a record becomes an array of
  // `[key, value]` pairs, an optional key becomes nullable-and-required) while `Toolkit.handle`
  // validates against the untransformed schema, so a compliant model is always rejected. Operations
  // therefore project to dynamic tools, whose JSON Schema the provider must use verbatim.
  test('the advertised schema is what the model is validated against', ({ expect }) => {
    const Mixed = Operation.make({
      meta: { key: DXN.make('com.example.operation.test.mixed') },
      input: Schema.Struct({
        typename: Schema.String,
        properties: Schema.Record(Schema.String, Schema.Any),
        text: Schema.optional(Schema.String),
      }),
      output: Schema.Void,
    });

    const tool = projectFunctionToTool(Mixed);
    const advertised = Tool.getJsonSchema(tool);
    // Passing through the provider's codec must not change it.
    expect(Tool.getJsonSchema(tool, { transformer: AnthropicStructuredOutput.toCodecAnthropic })).toEqual(advertised);

    const properties = advertised.properties as Record<string, Record<string, unknown>>;
    // An optional key is stated as the bare type and left out of `required`, never as nullable: v4
    // emits `anyOf: [T, null]` for it, yet its decoder rejects the `null` a model would then send.
    expect(properties.text).toEqual({ type: 'string' });
    expect(advertised.required).toEqual(['typename', 'properties']);
    // An open record is stated as an object that admits any property, not as an array of pairs.
    expect(properties.properties).toEqual({ type: 'object', additionalProperties: true });

    // And an object from the model decodes against the schema the tool validates with.
    const fields = createStructFieldsFromSchema(Mixed.input);
    const decoded: any = Schema.decodeUnknownSync(Schema.Struct(fields))({
      typename: 'example.Type',
      properties: { any: 1 },
    });
    expect(decoded.properties).toEqual({ any: 1 });
  });
});

describe('makeToolResolverFromOperations', () => {
  const op = (key: string) =>
    Operation.serialize(
      Operation.make({
        meta: { key: DXN.make(key), name: 'Display Copy' },
        input: Schema.Struct({ value: Schema.String }),
        output: Schema.Struct({ ok: Schema.Boolean }),
      }),
    );

  /** Runs `body` against one resolver instance, so a cached index persists across its resolutions. */
  const withResolver = <A>(
    registry: ReturnType<typeof makeRegistry>,
    body: (resolve: (id: string) => Effect.Effect<Tool.Any, any>) => Effect.Effect<A, any>,
  ) =>
    Effect.gen(function* () {
      const resolver = yield* ToolResolverService;
      return yield* body((id) => resolver.resolve(ToolId.make(id)));
    }).pipe(
      Effect.provide(makeToolResolverFromOperations().pipe(Layer.provide(Layer.succeed(Registry.Service, registry)))),
      Effect.provide(OpaqueToolkit.providerLayer(OpaqueToolkit.empty)),
      EffectEx.runPromise,
    );

  test('resolves an operation the registry carries, by its derived tool name', async ({ expect }) => {
    const registry = makeRegistry({ initial: [op('org.dxos.operation.markdown.create')] });
    const tool = await withResolver(registry, (resolve) => resolve('markdown-create'));
    expect(tool.name).toBe('markdown-create');
  });

  // The query is an await point, so a registration landing mid-build must not be lost: clearing the
  // cache alone would be undone by the assignment of the snapshot taken before the change.
  test('a collision registered while the index was being built still fails', async ({ expect }) => {
    const registry = makeRegistry({ initial: [op('org.dxos.operation.webSearch.fetch')] });
    // Fires the registration inside the first query, after the snapshot is taken but before it is cached.
    let pending: (() => void) | undefined = () => registry.add([op('org.dxos.operation.web-search.fetch')]);
    const query = registry.query.bind(registry);
    registry.query = (...args: Parameters<typeof query>) => {
      const result = query(...args);
      const run = result.run.bind(result);
      result.run = async () => {
        const records = await run();
        pending?.();
        pending = undefined;
        return records;
      };
      return result;
    };

    const attempt = withResolver(registry, (resolve) => resolve('web-search-fetch'));
    await expect(attempt).rejects.toThrow(/claimed by 2 operations/);
  });

  // Both resolutions share one resolver, so the second reads an index the first already built: without
  // invalidation the stale hit would silently pick one of two claimants instead of reporting the
  // ambiguity. A resolver per call would pass either way, since the second would build a fresh index.
  test('a collision registered after the index was built still fails', async ({ expect }) => {
    const registry = makeRegistry({ initial: [op('org.dxos.operation.webSearch.fetch')] });
    const attempt = withResolver(registry, (resolve) =>
      Effect.gen(function* () {
        const first = yield* resolve('web-search-fetch');
        yield* Effect.sync(() => registry.add([op('org.dxos.operation.web-search.fetch')]));
        return { first: first.name, second: yield* Effect.result(resolve('web-search-fetch')) };
      }),
    );
    await expect(attempt).rejects.toThrow(/claimed by 2 operations/);
  });

  // A recursive input renders as `$ref: '#/$defs/…'` with the bodies in the document's separate
  // `definitions` record. Keeping only the root advertised a reference to nothing -- and a model can
  // still answer correctly by inferring the shape from the prompt, so a passing end-to-end test is no
  // evidence the schema itself resolves.
  test('a recursive operation input advertises the definitions its refs point at', ({ expect }) => {
    interface Node {
      readonly text: string;
      readonly child?: Node;
    }
    const Node: Schema.Codec<Node> = Schema.Struct({
      text: Schema.String,
      child: Schema.optional(Schema.suspend((): Schema.Codec<Node> => Node)),
    });

    const Recursive = Operation.make({
      meta: { key: DXN.make('com.example.operation.test.recursive') },
      input: Schema.Struct({ node: Node }),
      output: Schema.Void,
    });

    const advertised = Tool.getJsonSchema(projectFunctionToTool(Recursive));
    expect(danglingRefs(advertised)).toEqual([]);
    // The recursion is expressed by reference, not inlined to some arbitrary depth.
    expect(Object.keys((advertised as Record<string, any>).$defs ?? {})).not.toHaveLength(0);
  });

  /** Reports every `$ref` in the document that no `$defs` entry defines. */
  const danglingRefs = (document: unknown): string[] => {
    const defs = new Set(Object.keys(((document as Record<string, unknown>).$defs ?? {}) as object));
    const collect = (node: unknown): string[] => {
      if (Array.isArray(node)) {
        return node.flatMap(collect);
      }
      if (typeof node !== 'object' || node === null) {
        return [];
      }
      return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
        key === '$ref' && typeof value === 'string'
          ? defs.has(value.replace('#/$defs/', ''))
            ? []
            : [value]
          : collect(value),
      );
    };
    return collect(document);
  };
});

describe('isHandlerLike', () => {
  test('accepts a value with a tools object and a handle function', ({ expect }) => {
    expect(isHandlerLike({ tools: {}, handle: () => {} })).toBe(true);
  });

  test('rejects a value whose tools is null', ({ expect }) => {
    expect(isHandlerLike({ tools: null, handle: () => {} })).toBe(false);
  });

  test('rejects a value with no handle function', ({ expect }) => {
    expect(isHandlerLike({ tools: {} })).toBe(false);
  });

  test('rejects primitives', ({ expect }) => {
    expect(isHandlerLike(null)).toBe(false);
    expect(isHandlerLike(undefined)).toBe(false);
    expect(isHandlerLike('toolkit')).toBe(false);
  });
});
