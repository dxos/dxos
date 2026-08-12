//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import * as Mailbox from '@dxos/plugin-inbox/Mailbox';
import { type Space } from '@dxos/react-client/echo';

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
