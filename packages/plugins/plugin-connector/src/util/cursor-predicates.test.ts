//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Obj, Ref, URI } from '@dxos/echo';
import { Cursor } from '@dxos/link';
import { Expando } from '@dxos/schema';

import { isCursorForTarget } from './cursor-predicates';

/**
 * A cursor persisted by an older client stores its target as the legacy local EID (`echo:/<id>`),
 * while `Ref.make` now produces the canonical `echo:///<id>`. Comparing the two raw URI strings
 * reported the binding as absent, which is what kept a bound mailbox offering Connect instead of
 * Sync: both the connect action and the sync action key on this one predicate.
 */
describe('isCursorForTarget', () => {
  const makeTarget = () => Obj.make(Expando.Expando, { name: 'Inbox' });

  const makeCursor = (targetUri: string) =>
    Cursor.makeExternal({
      source: Ref.fromURI(URI.make('echo:///01J00J9B45YHYSGZQTQMSKMGJ6')),
      target: Ref.fromURI(URI.make(targetUri)),
    });

  test('matches a target stored in the canonical local form', () => {
    const target = makeTarget();
    expect(isCursorForTarget(makeCursor(`echo:///${target.id}`), target)).toBe(true);
  });

  test('matches a target stored in the legacy single-slash form', () => {
    const target = makeTarget();
    expect(isCursorForTarget(makeCursor(`echo:/${target.id}`), target)).toBe(true);
  });

  test('matches a target stored in the space-qualified form', () => {
    const target = makeTarget();
    expect(isCursorForTarget(makeCursor(`echo://BA25QRC2FEWCSAMRP4RZL65LWJ7352CKE/${target.id}`), target)).toBe(true);
  });

  test('does not match a different object', () => {
    const target = makeTarget();
    const other = makeTarget();
    expect(isCursorForTarget(makeCursor(`echo:///${other.id}`), target)).toBe(false);
  });
});
