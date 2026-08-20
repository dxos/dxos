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

import { createStructFieldsFromSchema, makeToolResolverFromOperations, projectFunctionToTool } from './services';

describe('createStructFieldsFromSchema', () => {
  const SPACE = SpaceId.random();
  const OBJECT = EntityId.random();

  // Projects a tool input schema for the LLM and decodes the given `in` value the way a tool call would.
  const decodeIn = (schema: Schema.Codec<any, any>, value: unknown): any[] => {
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
      meta: { key: DXN.make('org.dxos.test.function.noParams') },
      input: Schema.Void,
      output: Schema.Void,
    });

    const emitted = Tool.getJsonSchema(projectFunctionToTool(Parameterless));
    expect(strictOffenders(emitted)).toEqual([]);
    expect(emitted.type).toBe('object');
  });

  // An operation taking arbitrary JSON cannot be described under a provider's strict mode: the value
  // slot emits the empty schema, which Anthropic rejects ("Empty schema ({}) that accepts any JSON
  // value is not supported"). Strict is therefore off for projected operations — re-enabling it makes
  // every request fail, since all tools are sent together.
  test('an operation taking arbitrary JSON is not advertised as strict', ({ expect }) => {
    const PropertyBag = Operation.make({
      meta: { key: DXN.make('org.dxos.test.function.propertyBag') },
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
      meta: { key: DXN.make('org.dxos.test.function.mixed') },
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
        meta: { key: DXN.make(key as any), name: 'Display Copy' },
        input: Schema.Struct({ value: Schema.String }),
        output: Schema.Struct({ ok: Schema.Boolean }),
      }),
    );

  const resolve = (registry: ReturnType<typeof makeRegistry>, id: string) =>
    Effect.gen(function* () {
      const resolver = yield* ToolResolverService;
      return yield* resolver.resolve(ToolId.make(id));
    }).pipe(
      Effect.provide(makeToolResolverFromOperations().pipe(Layer.provide(Layer.succeed(Registry.Service, registry)))),
      Effect.provide(OpaqueToolkit.providerLayer(OpaqueToolkit.empty)),
      EffectEx.runPromise,
    );

  test('resolves an operation the registry carries, by its derived tool name', async ({ expect }) => {
    const registry = makeRegistry({ initial: [op('org.dxos.function.markdown.create')] });
    const tool = await resolve(registry, 'markdown-create');
    expect(tool.name).toBe('markdown-create');
  });

  // The index is cached, so a name that resolved once must not keep resolving after a second claimant
  // registers: a stale hit would silently pick one of two operations rather than report the ambiguity.
  test('a collision registered after the index was built still fails', async ({ expect }) => {
    const registry = makeRegistry({ initial: [op('org.dxos.function.webSearch.fetch')] });
    expect((await resolve(registry, 'web-search-fetch')).name).toBe('web-search-fetch');

    registry.add([op('org.dxos.function.web-search.fetch')]);
    await expect(resolve(registry, 'web-search-fetch')).rejects.toThrow(/claimed by 2 operations/);
  });
});
