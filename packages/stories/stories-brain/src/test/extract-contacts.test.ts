//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { log } from '@dxos/log';

import {
  type ActorRole,
  emailDomain,
  extractActors,
  fixtureExists,
  loadFixtureMessages,
  round,
  writeResults,
} from '../testing/harness';

// Actor extraction is deterministic header parsing (sender + to + cc), so it does not vary by model.
describe.skipIf(!fixtureExists())('extract actors as contacts (deterministic)', () => {
  test('extracts sender/to/cc actors and dedupes into contacts', ({ expect }) => {
    const messages = loadFixtureMessages();

    const start = performance.now();
    const actors = messages.flatMap(extractActors);
    const byEmail = new Map<string, { email: string; name?: string; roles: Set<ActorRole> }>();
    for (const actor of actors) {
      const existing = byEmail.get(actor.email);
      if (existing) {
        existing.roles.add(actor.role);
        existing.name ??= actor.name;
      } else {
        byEmail.set(actor.email, { email: actor.email, name: actor.name, roles: new Set([actor.role]) });
      }
    }
    const durationMs = Math.round(performance.now() - start);

    const byRole: Record<ActorRole, number> = { from: 0, to: 0, cc: 0 };
    for (const actor of actors) {
      byRole[actor.role]++;
    }
    const orgs = new Set(actors.map((actor) => emailDomain(actor.email)).filter(Boolean));

    log.info('contacts', { totalActors: actors.length, distinctContacts: byEmail.size, distinctOrgs: orgs.size });

    writeResults('extract-contacts', {
      name: 'extract-contacts',
      note: 'Deterministic (RFC5322 header parsing); model-independent.',
      generatedAt: new Date().toISOString(),
      corpusSize: messages.length,
      durationMs,
      totalActors: actors.length,
      distinctContacts: byEmail.size,
      distinctOrgs: orgs.size,
      actorsPerMessage: round(actors.length / Math.max(1, messages.length)),
      byRole,
      contacts: [...byEmail.values()].map((contact) => ({
        email: contact.email,
        name: contact.name,
        roles: [...contact.roles],
      })),
    });

    expect(byEmail.size).toBeGreaterThan(0);
  });
});
