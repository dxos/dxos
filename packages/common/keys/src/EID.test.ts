//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import * as EID from './EID';
import { EntityId } from './entity-id';
import { SpaceId } from './space-id';

const SPACE = SpaceId.random();
const OBJECT = EntityId.random();
const OBJECT2 = EntityId.random();

describe('EID.make', () => {
  test('produces qualified echo URI from spaceId + objectId', ({ expect }) => {
    expect(EID.make({ spaceId: SPACE, entityId: OBJECT })).toBe(`echo://${SPACE}/${OBJECT}`);
  });

  test('produces local echo URI from objectId only', ({ expect }) => {
    expect(EID.make({ entityId: OBJECT })).toBe(`echo:/${OBJECT}`);
  });

  test('produces space-only echo URI from spaceId only', ({ expect }) => {
    expect(EID.make({ spaceId: SPACE })).toBe(`echo://${SPACE}`);
  });

  test('throws when neither id is provided', ({ expect }) => {
    expect(() => EID.make({})).toThrow();
  });
});

describe('EID.isEID', () => {
  test('accepts new format', ({ expect }) => {
    expect(EID.isEID(`echo://${SPACE}/${OBJECT}`)).toBe(true);
    expect(EID.isEID(`echo:/${OBJECT}`)).toBe(true);
    expect(EID.isEID(`echo:///${OBJECT}`)).toBe(true);
    expect(EID.isEID(`echo://${SPACE}`)).toBe(true);
  });

  test('accepts legacy dxn:echo: format', ({ expect }) => {
    expect(EID.isEID(`dxn:echo:@:${OBJECT}`)).toBe(true);
    expect(EID.isEID(`dxn:echo:${SPACE}:${OBJECT}`)).toBe(true);
  });

  test('accepts legacy dxn:queue: format', ({ expect }) => {
    expect(EID.isEID(`dxn:queue:data:${SPACE}:${OBJECT}`)).toBe(true);
  });

  test('rejects non-echo strings', ({ expect }) => {
    expect(EID.isEID('dxn:org.dxos.type.calendar')).toBe(false);
    expect(EID.isEID('https://example.com')).toBe(false);
    expect(EID.isEID('')).toBe(false);
    expect(EID.isEID(42)).toBe(false);
  });
});

describe('EID.parse', () => {
  test('passes through new format unchanged', ({ expect }) => {
    const id = `echo://${SPACE}/${OBJECT}`;
    expect(EID.parse(id)).toBe(id);
  });

  test('normalizes legacy dxn:echo:@:<id> to echo:/<id>', ({ expect }) => {
    expect(EID.parse(`dxn:echo:@:${OBJECT}`)).toBe(`echo:/${OBJECT}`);
  });

  test('normalizes legacy dxn:echo:<space>:<obj> to echo://<space>/<obj>', ({ expect }) => {
    expect(EID.parse(`dxn:echo:${SPACE}:${OBJECT}`)).toBe(`echo://${SPACE}/${OBJECT}`);
  });

  test('normalizes legacy dxn:queue:<sub>:<space>:<queue> to echo://<space>/<queue>', ({ expect }) => {
    expect(EID.parse(`dxn:queue:data:${SPACE}:${OBJECT}`)).toBe(`echo://${SPACE}/${OBJECT}`);
  });

  test('normalizes legacy dxn:queue:<sub>:<space>:<queue>:<item> to echo://<space>/<item>', ({ expect }) => {
    expect(EID.parse(`dxn:queue:data:${SPACE}:${OBJECT}:${OBJECT2}`)).toBe(`echo://${SPACE}/${OBJECT2}`);
  });

  test('throws on invalid input', ({ expect }) => {
    expect(() => EID.parse('dxn:org.dxos.type.calendar')).toThrow();
    expect(() => EID.parse('not-a-uri')).toThrow();
    expect(() => EID.parse('echo:')).toThrow();
    expect(() => EID.parse('echo://')).toThrow();
  });
});

describe('EID.tryParse', () => {
  test('returns undefined on failure instead of throwing', ({ expect }) => {
    expect(EID.tryParse('not-a-uri')).toBeUndefined();
    expect(EID.tryParse(`echo:/${OBJECT}`)).toBe(`echo:/${OBJECT}`);
  });
});

describe('EID.getSpaceId', () => {
  test('returns spaceId from qualified ref', ({ expect }) => {
    expect(EID.getSpaceId(EID.make({ spaceId: SPACE, entityId: OBJECT }))).toBe(SPACE);
  });

  test('returns spaceId from space-only ref', ({ expect }) => {
    expect(EID.getSpaceId(EID.make({ spaceId: SPACE }))).toBe(SPACE);
  });

  test('returns undefined for local ref', ({ expect }) => {
    expect(EID.getSpaceId(EID.make({ entityId: OBJECT }))).toBeUndefined();
    expect(EID.getSpaceId(EID.parse(`echo:///${OBJECT}`))).toBeUndefined();
  });
});

describe('EID.getEntityId', () => {
  test('returns objectId from qualified ref', ({ expect }) => {
    expect(EID.getEntityId(EID.make({ spaceId: SPACE, entityId: OBJECT }))).toBe(OBJECT);
  });

  test('returns objectId from local ref', ({ expect }) => {
    expect(EID.getEntityId(EID.make({ entityId: OBJECT }))).toBe(OBJECT);
    expect(EID.getEntityId(EID.parse(`echo:///${OBJECT}`))).toBe(OBJECT);
  });

  test('returns undefined for space-only ref', ({ expect }) => {
    expect(EID.getEntityId(EID.make({ spaceId: SPACE }))).toBeUndefined();
  });
});

describe('EID.isLocal', () => {
  test('returns true for local refs', ({ expect }) => {
    expect(EID.isLocal(EID.make({ entityId: OBJECT }))).toBe(true);
    expect(EID.isLocal(EID.parse(`echo:///${OBJECT}`))).toBe(true);
  });

  test('returns false for qualified refs', ({ expect }) => {
    expect(EID.isLocal(EID.make({ spaceId: SPACE, entityId: OBJECT }))).toBe(false);
    expect(EID.isLocal(EID.make({ spaceId: SPACE }))).toBe(false);
  });

  test('normalizes legacy local format before checking', ({ expect }) => {
    expect(EID.isLocal(EID.parse(`dxn:echo:@:${OBJECT}`))).toBe(true);
  });
});

describe('EID.equals', () => {
  test('returns true for identical refs', ({ expect }) => {
    const id = EID.make({ spaceId: SPACE, entityId: OBJECT });
    expect(EID.equals(id, id)).toBe(true);
  });

  test('returns true for equivalent legacy and new format', ({ expect }) => {
    const legacy = EID.parse(`dxn:echo:@:${OBJECT}`);
    const modern = EID.make({ entityId: OBJECT });
    expect(EID.equals(legacy, modern)).toBe(true);
  });

  test('returns false for different refs', ({ expect }) => {
    const a = EID.make({ spaceId: SPACE, entityId: OBJECT });
    const b = EID.make({ spaceId: SPACE, entityId: OBJECT2 });
    expect(EID.equals(a, b)).toBe(false);
  });
});
