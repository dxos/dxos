//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';
import { EID, EntityId, SpaceId } from '@dxos/keys';

import { createStructFieldsFromSchema } from './services';

describe('createStructFieldsFromSchema', () => {
  const SPACE = SpaceId.random();
  const OBJECT = EntityId.random();

  // Projects a tool input schema for the LLM and decodes the given `in` value the way a tool call would.
  const decodeIn = (schema: Schema.Schema<any, any>, value: unknown): any[] => {
    const fields = createStructFieldsFromSchema(schema);
    const decoded: any = Schema.decodeUnknownSync(Schema.Struct(fields))({ in: value });
    return decoded.in;
  };

  // An LLM-supplied ref URI string must coerce to a valid local EID. Refs nested inside an optional
  // field surface as a `T | undefined` union; the projection must still route them through the
  // LLM-friendly coercion so a qualified URI does not become a malformed `echo:////…`.
  test('coerces refs passed as qualified URI strings inside an optional array', () => {
    const refs = decodeIn(Schema.Struct({ in: Schema.optional(Schema.Array(Ref.Ref(Obj.Unknown))) }), [
      `echo://${SPACE}/${OBJECT}`,
    ]);
    expect(refs).toHaveLength(1);
    expect(() => EID.parse(refs[0].uri)).not.toThrow();
    expect(refs[0].uri).toBe(`echo:///${OBJECT}`);
  });

  test('coerces refs passed as qualified URI strings inside a required array', () => {
    const refs = decodeIn(Schema.Struct({ in: Schema.Array(Ref.Ref(Obj.Unknown)) }), [`echo://${SPACE}/${OBJECT}`]);
    expect(refs).toHaveLength(1);
    expect(refs[0].uri).toBe(`echo:///${OBJECT}`);
  });
});
