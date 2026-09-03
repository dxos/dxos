//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { makeIdentityIndex } from '@dxos/extractor';
import { Organization } from '@dxos/types';

import { identitySpecs } from './identity.ts';
import { isAutomatedSender, shouldExtractContact } from './selection.ts';

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

describe('isAutomatedSender', () => {
  // Addresses taken verbatim from a real synced mailbox that ended up with 101 Person objects, most
  // of them machines. Each one must be recognised WITHOUT any header signals, since the per-message
  // Contact extractor has nothing but the address to go on.
  test('recognises the machines a real mailbox is full of', ({ expect }) => {
    for (const email of [
      'no-reply@grafana.com',
      'noreply@safesendreturns.com',
      'mailer-daemon@googlemail.com',
      'invoice+statements+acct_1ika5ja3kz32dpo1@stripe.com',
      'invoice+statements@midjourney.com',
      'payments-noreply@google.com',
      'no_reply@notifications.intuit.com',
      'testflight_no_reply@email.apple.com',
      'notify@updates.notion.so',
      'notifications@harvestapp.com',
      'support@digitalocean.com',
      'billing@earthclassmail.com',
      'renewals@vouch.us',
      'success@vouch.us',
      'hello@mercury.com',
      'prospectus_mbox@investordelivery.com',
      'website@huggingface.co',
    ]) {
      expect(isAutomatedSender(email), email).toBe(true);
    }
  });

  test('leaves individuals alone, including qualified and plus-addressed ones', ({ expect }) => {
    for (const email of [
      'chad@blueyard.com',
      'marijn@haverbeke.berlin',
      'hadley.handel@deel.com',
      'ngudmand@kirkconsult.com',
      'ymaline@citrincooperman.com',
      // A person's own plus-addressing must not read as a role mailbox.
      'rich+dxos@braneframe.com',
      // Substrings of role words are not role words.
      'infosec.lead@dxos.org',
      'teamus@dxos.org',
      'noreplacement@dxos.org',
    ]) {
      expect(isAutomatedSender(email), email).toBe(false);
    }
  });

  test('header signals deny on their own, whatever the address looks like', ({ expect }) => {
    expect(isAutomatedSender('alice@dxos.org', { noReply: true })).toBe(true);
    expect(isAutomatedSender('alice@dxos.org', { bulk: true })).toBe(true);
    expect(isAutomatedSender('alice@dxos.org', { listUnsubscribe: '<https://dxos.org/u>' })).toBe(true);
    expect(isAutomatedSender('alice@dxos.org', {})).toBe(false);
  });

  test('the role pattern is a prefix, not an equality — the bug that let bulk billing through', ({ expect }) => {
    // `shouldExtractContact` shares the check, so the same senders are denied on the bulk path even
    // when they arrive with an outbound claim.
    const index = indexWith();
    expect(shouldExtractContact('invoice+statements+acct_1abc@stripe.com', { outbound: true }, index)).toBe(false);
    expect(shouldExtractContact('billing+eu@dxos.org', { outbound: true }, index)).toBe(false);
    expect(shouldExtractContact('alice@dxos.org', { outbound: true }, index)).toBe(true);
  });
});
