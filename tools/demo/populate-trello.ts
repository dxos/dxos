#!/usr/bin/env tsx
//
// Copyright 2026 DXOS.org
//

/**
 * Populate a Trello board with the Widgets-team demo fixture. Uses the Trello
 * REST API directly — no browser automation required.
 *
 * Reads TRELLO_API_KEY, TRELLO_API_TOKEN, and TRELLO_BOARD_ID from
 * `tools/demo/.env.demo`. Idempotent: matches lists and cards by name, so
 * re-running is safe.
 *
 * Usage:
 *   pnpm --filter @dxos/demo-setup exec tsx populate-trello.ts
 */

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const DEMO_DIR = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(DEMO_DIR, '.env.demo');
const TRELLO_BASE = 'https://api.trello.com/1';

const LIST_NAMES = ['Backlog', 'In Progress', 'Review', 'Done'] as const;

type CardSpec = { name: string; desc: string; list: (typeof LIST_NAMES)[number] };

const CARDS: readonly CardSpec[] = [
  {
    name: 'Color picker redesign',
    desc: 'Rework the color picker for accessibility. Current UX is confusing for colorblind users. Ship an HSL split with a live preview swatch.',
    list: 'In Progress',
  },
  {
    name: 'Widget dragging bug',
    desc: 'Drop targets flicker on slow machines. Needs a repro + fix. Likely a mousemove throttle issue.',
    list: 'In Progress',
  },
  {
    name: 'Auth provider migration',
    desc: 'Migrate from the legacy auth provider to the new OIDC-compliant service. Parked until next sprint.',
    list: 'In Progress',
  },
  { name: 'Dark mode', desc: 'Full dark theme pass across the app. Blocked on design.', list: 'Backlog' },
  { name: 'i18n pass', desc: 'Localize the UI for FR / DE / JA. Need to switch date formats + pluralization.', list: 'Backlog' },
  {
    name: 'Perf regression investigation',
    desc: 'Users on older Macs report lag after 0.42. Suspected culprit: virtualization threshold on the card list.',
    list: 'Backlog',
  },
  {
    name: 'Search refactor',
    desc: 'Unify the board-search and global-search code paths behind a shared query builder.',
    list: 'Review',
  },
  {
    name: 'Onboarding redesign',
    desc: 'New three-step onboarding that skips sample-data creation for returning users.',
    list: 'Done',
  },
];

type TrelloList = { id: string; name: string; closed: boolean };
type TrelloCard = { id: string; name: string; desc: string; idList: string };

const trelloRequest = async <T>(
  method: 'GET' | 'POST' | 'PUT',
  path: string,
  params: Record<string, string>,
  auth: { key: string; token: string },
): Promise<T> => {
  const url = new URL(`${TRELLO_BASE}${path}`);
  url.searchParams.set('key', auth.key);
  url.searchParams.set('token', auth.token);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url.toString(), { method });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Trello ${method} ${path} → ${response.status}: ${body.slice(0, 300)}`);
  }
  return (await response.json()) as T;
};

const main = async (): Promise<void> => {
  if (!existsSync(ENV_PATH)) {
    console.error(`Missing ${ENV_PATH}. Copy .env.demo.example → .env.demo and fill it in.`);
    process.exit(1);
  }
  dotenv.config({ path: ENV_PATH });

  const key = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_API_TOKEN;
  const boardId = process.env.TRELLO_BOARD_ID;
  if (!key || !token || !boardId) {
    console.error('TRELLO_API_KEY, TRELLO_API_TOKEN, TRELLO_BOARD_ID must all be set in .env.demo.');
    process.exit(1);
  }
  const auth = { key, token };

  console.log(`Board: ${boardId}`);

  const existingLists = await trelloRequest<TrelloList[]>('GET', `/boards/${boardId}/lists`, { fields: 'id,name,closed' }, auth);
  const listByName = new Map<string, TrelloList>(existingLists.filter((list) => !list.closed).map((list) => [list.name, list]));

  for (const name of LIST_NAMES) {
    if (listByName.has(name)) {
      console.log(`  · list "${name}" already exists`);
      continue;
    }
    const created = await trelloRequest<TrelloList>('POST', '/lists', { idBoard: boardId, name, pos: 'bottom' }, auth);
    listByName.set(name, created);
    console.log(`  + created list "${name}"`);
  }

  const existingCards = await trelloRequest<TrelloCard[]>(
    'GET',
    `/boards/${boardId}/cards`,
    { fields: 'id,name,desc,idList' },
    auth,
  );
  const cardByName = new Map<string, TrelloCard>(existingCards.map((card) => [card.name, card]));

  let created = 0;
  let updated = 0;
  for (const spec of CARDS) {
    const targetList = listByName.get(spec.list);
    if (!targetList) {
      console.error(`  ! missing target list "${spec.list}" — skipping card "${spec.name}"`);
      continue;
    }
    const existing = cardByName.get(spec.name);
    if (!existing) {
      await trelloRequest<TrelloCard>(
        'POST',
        '/cards',
        { idList: targetList.id, name: spec.name, desc: spec.desc, pos: 'bottom' },
        auth,
      );
      console.log(`  + card "${spec.name}" → ${spec.list}`);
      created += 1;
      continue;
    }
    const needsUpdate = existing.desc !== spec.desc || existing.idList !== targetList.id;
    if (!needsUpdate) {
      continue;
    }
    await trelloRequest<TrelloCard>('PUT', `/cards/${existing.id}`, { desc: spec.desc, idList: targetList.id }, auth);
    console.log(`  ~ card "${spec.name}" updated (list=${spec.list})`);
    updated += 1;
  }

  console.log(`\nDone. Created ${created}, updated ${updated}, unchanged ${CARDS.length - created - updated}.`);
  console.log(`Open: https://trello.com/b/${boardId}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
