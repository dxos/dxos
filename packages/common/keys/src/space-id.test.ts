import { expect, test } from 'vitest';
import { SpaceId } from './space-id';

test('space-id', () => {
  const id = SpaceId.random();

  expect(SpaceId.isValid(id)).toBe(true);
  expect(id.length).toBe(33);
  const decoded = SpaceId.decode(id);
  expect(decoded.length).toBe(SpaceId.byteLength);
  expect(SpaceId.encode(decoded)).toBe(id);
});
