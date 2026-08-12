//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { type Space } from '@dxos/react-client/echo';
import { Organization } from '@dxos/types';

import { importMessages } from './archive';
import { seedDemoMessages } from './messages';

/**
 * Adds a Mailbox seeded from the pulled `@dxos/fixtures` mailbox corpus (served by the storybook
 * dev server at `/fixtures/<name>.json` — see `.storybook/main.mts`), falling back to the shared
 * demo messages when no corpus has been pulled (CI, fresh checkout). The dev server SPA-fallbacks
 * unknown paths with HTML, so gate on the content type rather than the status alone.
 */
export const loadMailboxFixture = async (space: Space, fixture = 'mailbox'): Promise<Mailbox.Mailbox> => {
  const mailbox = space.db.add(Mailbox.make({ name: 'Inbox' }));
  await space.db.flush();
  const response = await fetch(`/fixtures/${fixture}.json`).catch(() => undefined);
  if (response?.ok && response.headers.get('content-type')?.includes('application/json')) {
    const archived: unknown[] = await response.json();
    await importMessages(mailbox, archived, space.db);
  } else {
    const feed = await mailbox.feed.load();
    await EffectEx.runPromise(seedDemoMessages(feed).pipe(Effect.provide(Database.layer(space.db))));
  }
  await space.db.flush({ indexes: true });
  return mailbox;
};

/**
 * Organizations for the demo senders' domains: the contact-extraction gate is an allow-list, so a
 * sender earns a Person only when its domain matches a known Organization.
 */
const DEMO_ORGANIZATIONS = [
  { name: 'Sequoia Capital', website: 'https://sequoia.com' },
  { name: 'Globex Corporation', website: 'https://globex.com' },
  { name: 'Initech', website: 'https://initech.com' },
];

/** Adds a Mailbox with the shared demo messages on its feed, plus the extraction-gate Organizations. */
export const seedCrmMailbox = async (space: Space): Promise<Mailbox.Mailbox> => {
  const mailbox = space.db.add(Mailbox.make({ name: 'Inbox' }));
  await space.db.flush();
  const feed = await mailbox.feed.load();
  await EffectEx.runPromise(seedDemoMessages(feed).pipe(Effect.provide(Database.layer(space.db))));
  DEMO_ORGANIZATIONS.forEach((organization) => space.db.add(Obj.make(Organization.Organization, organization)));
  await space.db.flush({ indexes: true });
  return mailbox;
};

/** Selects a story mailbox seed — the arg a story passes through `withPluginManager`'s initializer. */
export type StorySeed = 'fixture' | 'crm';

export const seedStoryMailbox = (space: Space, kind: StorySeed = 'fixture'): Promise<Mailbox.Mailbox> =>
  kind === 'crm' ? seedCrmMailbox(space) : loadMailboxFixture(space);
