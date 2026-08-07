//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { makeIdentityIndex } from '@dxos/extractor';
import { Organization } from '@dxos/types';

import { identitySpecs } from './identity';
import { shouldExtractContact } from './selection';

const indexWith = (...organizations: Organization.Organization[]) => {
  const index = makeIdentityIndex(identitySpecs);
  organizations.forEach((organization) => index.register(organization));
  return index;
};

describe('shouldExtractContact', () => {
  test('a sender we replied to is extracted, whoever they are', ({ expect }) => {
    expect(shouldExtractContact('alice@unknown.com', { outbound: true }, indexWith())).toBe(true);
  });

  test('a sender at a known Organization is extracted', ({ expect }) => {
    const index = indexWith(Organization.make({ name: 'DXOS', website: 'dxos.org' }));
    expect(shouldExtractContact('alice@dxos.org', {}, index)).toBe(true);
  });

  test('an unknown sender we have never replied to is not extracted', ({ expect }) => {
    expect(shouldExtractContact('alice@unknown.com', {}, indexWith())).toBe(false);
  });

  test('no-reply addresses are never extracted', ({ expect }) => {
    const index = indexWith(Organization.make({ name: 'DXOS', website: 'dxos.org' }));
    for (const email of [
      'no-reply@dxos.org',
      'noreply@dxos.org',
      'do-not-reply@dxos.org',
      'donotreply@dxos.org',
      'mailer-daemon@dxos.org',
      'bounces@dxos.org',
      'testflight_no_reply@dxos.org',
    ]) {
      expect(shouldExtractContact(email, {}, index), email).toBe(false);
    }
  });

  test('role mailboxes are never extracted', ({ expect }) => {
    const index = indexWith(Organization.make({ name: 'DXOS', website: 'dxos.org' }));
    for (const local of ['support', 'billing', 'info', 'newsletter', 'notifications', 'sales']) {
      expect(shouldExtractContact(`${local}@dxos.org`, {}, index), local).toBe(false);
    }
  });

  test('deny beats allow — a newsletter from a known Organization is skipped', ({ expect }) => {
    const index = indexWith(Organization.make({ name: 'DXOS', website: 'dxos.org' }));
    expect(shouldExtractContact('alice@dxos.org', { listUnsubscribe: '<https://dxos.org/u>' }, index)).toBe(false);
    expect(shouldExtractContact('alice@dxos.org', { bulk: true }, index)).toBe(false);
    expect(shouldExtractContact('alice@dxos.org', { noReply: true }, index)).toBe(false);
  });

  test('deny beats allow even for a sender we replied to', ({ expect }) => {
    // A reply to a list address is still list mail; the address is not a person.
    expect(shouldExtractContact('news@dxos.org', { outbound: true, bulk: true }, indexWith())).toBe(false);
  });

  test('an actor with no email is never extracted', ({ expect }) => {
    expect(shouldExtractContact(undefined, { outbound: true }, indexWith())).toBe(false);
  });
});
