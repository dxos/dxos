//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import * as EchoId from './EchoId';
import { ObjectId } from './object-id';
import { SpaceId } from './space-id';

const SPACE = SpaceId.random();
const OBJECT = ObjectId.random();
const OBJECT2 = ObjectId.random();

describe('EchoId.fromSpaceAndObjectId', () => {
  test('produces qualified echo URI', ({ expect }) => {
    const id = EchoId.fromSpaceAndObjectId(SPACE, OBJECT);
    expect(id).toBe(`echo://${SPACE}/${OBJECT}`);
  });
});

describe('EchoId.fromLocalObjectId', () => {
  test('produces local echo URI', ({ expect }) => {
    const id = EchoId.fromLocalObjectId(OBJECT);
    expect(id).toBe(`echo:/${OBJECT}`);
  });
});

describe('EchoId.fromSpaceId', () => {
  test('produces space-only echo URI', ({ expect }) => {
    const id = EchoId.fromSpaceId(SPACE);
    expect(id).toBe(`echo://${SPACE}`);
  });
});

describe('EchoId.isEchoId', () => {
  test('accepts new format', ({ expect }) => {
    expect(EchoId.isEchoId(`echo://${SPACE}/${OBJECT}`)).toBe(true);
    expect(EchoId.isEchoId(`echo:/${OBJECT}`)).toBe(true);
    expect(EchoId.isEchoId(`echo:///${OBJECT}`)).toBe(true);
    expect(EchoId.isEchoId(`echo://${SPACE}`)).toBe(true);
  });

  test('accepts legacy dxn:echo: format', ({ expect }) => {
    expect(EchoId.isEchoId(`dxn:echo:@:${OBJECT}`)).toBe(true);
    expect(EchoId.isEchoId(`dxn:echo:${SPACE}:${OBJECT}`)).toBe(true);
  });

  test('accepts legacy dxn:queue: format', ({ expect }) => {
    expect(EchoId.isEchoId(`dxn:queue:data:${SPACE}:${OBJECT}`)).toBe(true);
  });

  test('rejects non-echo strings', ({ expect }) => {
    expect(EchoId.isEchoId('dxn:org.dxos.type.calendar')).toBe(false);
    expect(EchoId.isEchoId('https://example.com')).toBe(false);
    expect(EchoId.isEchoId('')).toBe(false);
    expect(EchoId.isEchoId(42)).toBe(false);
  });
});

describe('EchoId.parse', () => {
  test('passes through new format unchanged', ({ expect }) => {
    const id = `echo://${SPACE}/${OBJECT}`;
    expect(EchoId.parse(id)).toBe(id);
  });

  test('normalizes legacy dxn:echo:@:<id> to echo:/<id>', ({ expect }) => {
    expect(EchoId.parse(`dxn:echo:@:${OBJECT}`)).toBe(`echo:/${OBJECT}`);
  });

  test('normalizes legacy dxn:echo:<space>:<obj> to echo://<space>/<obj>', ({ expect }) => {
    expect(EchoId.parse(`dxn:echo:${SPACE}:${OBJECT}`)).toBe(`echo://${SPACE}/${OBJECT}`);
  });

  test('normalizes legacy dxn:queue:<sub>:<space>:<queue> to echo://<space>/<queue>', ({ expect }) => {
    expect(EchoId.parse(`dxn:queue:data:${SPACE}:${OBJECT}`)).toBe(`echo://${SPACE}/${OBJECT}`);
  });

  test('normalizes legacy dxn:queue:<sub>:<space>:<queue>:<item> to echo://<space>/<item>', ({ expect }) => {
    expect(EchoId.parse(`dxn:queue:data:${SPACE}:${OBJECT}:${OBJECT2}`)).toBe(`echo://${SPACE}/${OBJECT2}`);
  });

  test('throws on invalid input', ({ expect }) => {
    expect(() => EchoId.parse('dxn:org.dxos.type.calendar')).toThrow();
    expect(() => EchoId.parse('not-a-uri')).toThrow();
  });
});

describe('EchoId.tryParse', () => {
  test('returns undefined on failure instead of throwing', ({ expect }) => {
    expect(EchoId.tryParse('not-a-uri')).toBeUndefined();
    expect(EchoId.tryParse(`echo:/${OBJECT}`)).toBe(`echo:/${OBJECT}`);
  });
});

describe('EchoId.getSpaceId', () => {
  test('returns spaceId from qualified ref', ({ expect }) => {
    expect(EchoId.getSpaceId(EchoId.fromSpaceAndObjectId(SPACE, OBJECT))).toBe(SPACE);
  });

  test('returns spaceId from space-only ref', ({ expect }) => {
    expect(EchoId.getSpaceId(EchoId.fromSpaceId(SPACE))).toBe(SPACE);
  });

  test('returns undefined for local ref', ({ expect }) => {
    expect(EchoId.getSpaceId(EchoId.fromLocalObjectId(OBJECT))).toBeUndefined();
    expect(EchoId.getSpaceId(EchoId.parse(`echo:///${OBJECT}`))).toBeUndefined();
  });
});

describe('EchoId.getObjectId', () => {
  test('returns objectId from qualified ref', ({ expect }) => {
    expect(EchoId.getObjectId(EchoId.fromSpaceAndObjectId(SPACE, OBJECT))).toBe(OBJECT);
  });

  test('returns objectId from local ref', ({ expect }) => {
    expect(EchoId.getObjectId(EchoId.fromLocalObjectId(OBJECT))).toBe(OBJECT);
    expect(EchoId.getObjectId(EchoId.parse(`echo:///${OBJECT}`))).toBe(OBJECT);
  });

  test('returns undefined for space-only ref', ({ expect }) => {
    expect(EchoId.getObjectId(EchoId.fromSpaceId(SPACE))).toBeUndefined();
  });
});

describe('EchoId.isLocal', () => {
  test('returns true for local refs', ({ expect }) => {
    expect(EchoId.isLocal(EchoId.fromLocalObjectId(OBJECT))).toBe(true);
    expect(EchoId.isLocal(EchoId.parse(`echo:///${OBJECT}`))).toBe(true);
  });

  test('returns false for qualified refs', ({ expect }) => {
    expect(EchoId.isLocal(EchoId.fromSpaceAndObjectId(SPACE, OBJECT))).toBe(false);
    expect(EchoId.isLocal(EchoId.fromSpaceId(SPACE))).toBe(false);
  });

  test('normalizes legacy local format before checking', ({ expect }) => {
    expect(EchoId.isLocal(EchoId.parse(`dxn:echo:@:${OBJECT}`))).toBe(true);
  });
});

describe('EchoId.equals', () => {
  test('returns true for identical refs', ({ expect }) => {
    const id = EchoId.fromSpaceAndObjectId(SPACE, OBJECT);
    expect(EchoId.equals(id, id)).toBe(true);
  });

  test('returns true for equivalent legacy and new format', ({ expect }) => {
    const legacy = EchoId.parse(`dxn:echo:@:${OBJECT}`);
    const modern = EchoId.fromLocalObjectId(OBJECT);
    expect(EchoId.equals(legacy, modern)).toBe(true);
  });

  test('returns false for different refs', ({ expect }) => {
    const a = EchoId.fromSpaceAndObjectId(SPACE, OBJECT);
    const b = EchoId.fromSpaceAndObjectId(SPACE, OBJECT2);
    expect(EchoId.equals(a, b)).toBe(false);
  });
});
