//
// Copyright 2026 DXOS.org
//

import { describe, expectTypeOf, test } from 'vitest';

import { defineCatalog } from './catalog.ts';
import { type Capability, type Model, type Supporting, defineModel, requireCapabilities, supports } from './model.ts';
import { createRequest } from './request.ts';
import { catalog, embedded, haiku, opus } from './testing.ts';

// Asserts that a model declares a capability: one that does not narrows to `never` and rejects the
// argument, which is what lets the negative cases below be pinned as expected compile errors.
const expectSupports =
  <const Required extends Capability>() =>
  <M extends Model>(_model: Supporting<M, Required>): void => {};

describe('TypeSafe models', () => {
  test('a definition keeps its id and capabilities as literal types', ({ expect }) => {
    expectTypeOf(opus.id).toEqualTypeOf<'com.anthropic.model.claude-opus-5'>();
    expectSupports<'thinking'>()(opus);
    expect(opus.capabilities).toContain('thinking');
  });

  test('a model without a capability does not satisfy the model type that requires it', () => {
    // @ts-expect-error -- haiku declares no 'thinking' capability.
    expectSupports<'thinking'>()(haiku);

    // @ts-expect-error -- the embedded model declares no capabilities at all.
    expectSupports<'tools'>()(embedded);
  });

  test('requireCapabilities narrows at compile time and throws on a lie', ({ expect }) => {
    expect(requireCapabilities(opus, ['thinking', 'tools'])).toBe(opus);

    // A capability the model never declares is not assignable, so the call site is the failure point.
    // @ts-expect-error -- haiku does not declare 'thinking'.
    expect(() => requireCapabilities(haiku, ['thinking'])).toThrow(/missing capabilities: thinking/);
  });

  test('supports narrows the capability union', ({ expect }) => {
    expect(supports(haiku, 'tools')).toBe(true);
    expect(supports(haiku, 'thinking')).toBe(false);
    expect(supports(embedded, 'image')).toBe(false);
  });

  test('a request only accepts options the model can serve', ({ expect }) => {
    const request = createRequest(opus, 'hello', { thinking: true, tools: ['search'], maxTokens: 1024 });
    expectTypeOf(request.model).toEqualTypeOf<'com.anthropic.model.claude-opus-5'>();
    expect(request.options.thinking).toBe(true);

    // @ts-expect-error -- haiku declares no 'thinking' capability.
    createRequest(haiku, 'hello', { thinking: true });

    // @ts-expect-error -- the embedded model declares no 'tools' capability.
    createRequest(embedded, 'hello', { tools: ['search'] });

    expect(createRequest(haiku, 'hello', { tools: ['search'] }).options.tools).toEqual(['search']);
  });

  test('an unknown id is not a valid lookup', ({ expect }) => {
    expect(catalog.get('com.anthropic.model.claude-haiku-4-5')).toBe(haiku);

    // @ts-expect-error -- the id is not in the catalog.
    expect(() => catalog.get('com.acme.model.nonexistent')).toThrow(/Unknown model/);
  });

  test('a lookup returns the specific model, not the catalog union', () => {
    expectTypeOf(catalog.get('com.anthropic.model.claude-opus-5')).toEqualTypeOf<typeof opus>();
    expectTypeOf(catalog.get('com.meta.model.llama-3-2-1b')).toEqualTypeOf<typeof embedded>();
  });

  test('filtering by capability yields models that satisfy the capability-bearing type', ({ expect }) => {
    const thinkers = catalog.withCapability('thinking');
    thinkers.forEach((model) => expectSupports<'thinking'>()(model));
    expect(thinkers).toEqual([opus]);

    expect(catalog.withCapability('tools').map((model) => model.id)).toEqual([opus.id, haiku.id]);
    expect(catalog.withCapability('structuredOutput')).toEqual([opus]);
  });

  test('a catalog rejects duplicate ids', ({ expect }) => {
    const duplicate = defineModel({ ...opus, label: 'Copy' });
    expect(() => defineCatalog([opus, duplicate])).toThrow(/Duplicate model id/);
  });
});
