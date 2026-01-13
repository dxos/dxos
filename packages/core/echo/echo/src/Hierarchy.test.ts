import { describe, test, expect } from 'vitest';
import * as Schema from 'effect/Schema';
import * as Obj from './Obj';
import * as Type from './Type';
import { TestSchema } from './testing';

describe('Hierarchy', () => {
  test('setParent and getParent', async () => {
    const parent = Obj.make(TestSchema.Organization, { name: 'parent' });
    const child = Obj.make(TestSchema.Person, { name: 'child' });
    expect(Obj.getParent(child)).toBeUndefined();

    Obj.setParent(child, parent);
    expect(Obj.getParent(child)).toBe(parent);

    Obj.setParent(child, undefined);
    expect(Obj.getParent(child)).toBeUndefined();
  });
});
