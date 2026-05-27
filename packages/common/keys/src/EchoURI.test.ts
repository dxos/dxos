//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import * as EchoURI from './EchoURI';
import { ObjectId } from './object-id';
import { SpaceId } from './space-id';

const SPACE = SpaceId.random();
const OBJECT = ObjectId.random();
const OBJECT2 = ObjectId.random();

describe('EchoURI.make', () => {
  test('produces qualified echo URI from spaceId + objectId', ({ expect }) => {
    expect(EchoURI.make({ spaceId: SPACE, objectId: OBJECT })).toBe(`echo://${SPACE}/${OBJECT}`);
  });

  test('produces local echo URI from objectId only', ({ expect }) => {
    expect(EchoURI.make({ objectId: OBJECT })).toBe(`echo:/${OBJECT}`);
  });

  test('produces space-only echo URI from spaceId only', ({ expect }) => {
    expect(EchoURI.make({ spaceId: SPACE })).toBe(`echo://${SPACE}`);
  });

  test('throws when neither id is provided', ({ expect }) => {
    expect(() => EchoURI.make({})).toThrow();
  });
});

describe('EchoURI.isEchoURI', () => {
  test('accepts new format', ({ expect }) => {
    expect(EchoURI.isEchoURI(`echo://${SPACE}/${OBJECT}`)).toBe(true);
    expect(EchoURI.isEchoURI(`echo:/${OBJECT}`)).toBe(true);
    expect(EchoURI.isEchoURI(`echo:///${OBJECT}`)).toBe(true);
    expect(EchoURI.isEchoURI(`echo://${SPACE}`)).toBe(true);
  });

  test('accepts legacy dxn:echo: format', ({ expect }) => {
    expect(EchoURI.isEchoURI(`dxn:echo:@:${OBJECT}`)).toBe(true);
    expect(EchoURI.isEchoURI(`dxn:echo:${SPACE}:${OBJECT}`)).toBe(true);
  });

  test('accepts legacy dxn:queue: format', ({ expect }) => {
    expect(EchoURI.isEchoURI(`dxn:queue:data:${SPACE}:${OBJECT}`)).toBe(true);
  });

  test('rejects non-echo strings', ({ expect }) => {
    expect(EchoURI.isEchoURI('dxn:org.dxos.type.calendar')).toBe(false);
    expect(EchoURI.isEchoURI('https://example.com')).toBe(false);
    expect(EchoURI.isEchoURI('')).toBe(false);
    expect(EchoURI.isEchoURI(42)).toBe(false);
  });
});

describe('EchoURI.parse', () => {
  test('passes through new format unchanged', ({ expect }) => {
    const id = `echo://${SPACE}/${OBJECT}`;
    expect(EchoURI.parse(id)).toBe(id);
  });

  test('normalizes legacy dxn:echo:@:<id> to echo:/<id>', ({ expect }) => {
    expect(EchoURI.parse(`dxn:echo:@:${OBJECT}`)).toBe(`echo:/${OBJECT}`);
  });

  test('normalizes legacy dxn:echo:<space>:<obj> to echo://<space>/<obj>', ({ expect }) => {
    expect(EchoURI.parse(`dxn:echo:${SPACE}:${OBJECT}`)).toBe(`echo://${SPACE}/${OBJECT}`);
  });

  test('normalizes legacy dxn:queue:<sub>:<space>:<queue> to echo://<space>/<queue>', ({ expect }) => {
    expect(EchoURI.parse(`dxn:queue:data:${SPACE}:${OBJECT}`)).toBe(`echo://${SPACE}/${OBJECT}`);
  });

  test('normalizes legacy dxn:queue:<sub>:<space>:<queue>:<item> to echo://<space>/<item>', ({ expect }) => {
    expect(EchoURI.parse(`dxn:queue:data:${SPACE}:${OBJECT}:${OBJECT2}`)).toBe(`echo://${SPACE}/${OBJECT2}`);
  });

  test('throws on invalid input', ({ expect }) => {
    expect(() => EchoURI.parse('dxn:org.dxos.type.calendar')).toThrow();
    expect(() => EchoURI.parse('not-a-uri')).toThrow();
    expect(() => EchoURI.parse('echo:')).toThrow();
    expect(() => EchoURI.parse('echo://')).toThrow();
  });
});

describe('EchoURI.tryParse', () => {
  test('returns undefined on failure instead of throwing', ({ expect }) => {
    expect(EchoURI.tryParse('not-a-uri')).toBeUndefined();
    expect(EchoURI.tryParse(`echo:/${OBJECT}`)).toBe(`echo:/${OBJECT}`);
  });
});

describe('EchoURI.getSpaceId', () => {
  test('returns spaceId from qualified ref', ({ expect }) => {
    expect(EchoURI.getSpaceId(EchoURI.make({ spaceId: SPACE, objectId: OBJECT }))).toBe(SPACE);
  });

  test('returns spaceId from space-only ref', ({ expect }) => {
    expect(EchoURI.getSpaceId(EchoURI.make({ spaceId: SPACE }))).toBe(SPACE);
  });

  test('returns undefined for local ref', ({ expect }) => {
    expect(EchoURI.getSpaceId(EchoURI.make({ objectId: OBJECT }))).toBeUndefined();
    expect(EchoURI.getSpaceId(EchoURI.parse(`echo:///${OBJECT}`))).toBeUndefined();
  });
});

describe('EchoURI.getObjectId', () => {
  test('returns objectId from qualified ref', ({ expect }) => {
    expect(EchoURI.getObjectId(EchoURI.make({ spaceId: SPACE, objectId: OBJECT }))).toBe(OBJECT);
  });

  test('returns objectId from local ref', ({ expect }) => {
    expect(EchoURI.getObjectId(EchoURI.make({ objectId: OBJECT }))).toBe(OBJECT);
    expect(EchoURI.getObjectId(EchoURI.parse(`echo:///${OBJECT}`))).toBe(OBJECT);
  });

  test('returns undefined for space-only ref', ({ expect }) => {
    expect(EchoURI.getObjectId(EchoURI.make({ spaceId: SPACE }))).toBeUndefined();
  });
});

describe('EchoURI.isLocal', () => {
  test('returns true for local refs', ({ expect }) => {
    expect(EchoURI.isLocal(EchoURI.make({ objectId: OBJECT }))).toBe(true);
    expect(EchoURI.isLocal(EchoURI.parse(`echo:///${OBJECT}`))).toBe(true);
  });

  test('returns false for qualified refs', ({ expect }) => {
    expect(EchoURI.isLocal(EchoURI.make({ spaceId: SPACE, objectId: OBJECT }))).toBe(false);
    expect(EchoURI.isLocal(EchoURI.make({ spaceId: SPACE }))).toBe(false);
  });

  test('normalizes legacy local format before checking', ({ expect }) => {
    expect(EchoURI.isLocal(EchoURI.parse(`dxn:echo:@:${OBJECT}`))).toBe(true);
  });
});

describe('EchoURI.equals', () => {
  test('returns true for identical refs', ({ expect }) => {
    const id = EchoURI.make({ spaceId: SPACE, objectId: OBJECT });
    expect(EchoURI.equals(id, id)).toBe(true);
  });

  test('returns true for equivalent legacy and new format', ({ expect }) => {
    const legacy = EchoURI.parse(`dxn:echo:@:${OBJECT}`);
    const modern = EchoURI.make({ objectId: OBJECT });
    expect(EchoURI.equals(legacy, modern)).toBe(true);
  });

  test('returns false for different refs', ({ expect }) => {
    const a = EchoURI.make({ spaceId: SPACE, objectId: OBJECT });
    const b = EchoURI.make({ spaceId: SPACE, objectId: OBJECT2 });
    expect(EchoURI.equals(a, b)).toBe(false);
  });
});
