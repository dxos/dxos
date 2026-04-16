//
// Copyright 2026 DXOS.org
//

import { type Database, Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { Trello } from '@dxos/plugin-trello/types';

import { addToDemoCollection } from './collection';

const BOARD_ID = 'demo-widgets-board';
const LISTS = ['Backlog', 'In Progress', 'Review', 'Done'] as const;

type CardSpec = {
  id: string;
  name: string;
  description: string;
  list: (typeof LISTS)[number];
};

/** Eight realistic Widgets-team cards spanning a normal sprint's worth of work. */
const CARDS: readonly CardSpec[] = [
  {
    id: 'demo-card-color-picker',
    name: 'Color picker redesign',
    description:
      'Rework the color picker for accessibility. Current UX is confusing for colorblind users. Ship an HSL split with a live preview swatch.',
    list: 'In Progress',
  },
  {
    id: 'demo-card-dragging-bug',
    name: 'Widget dragging bug',
    description:
      'Drop targets flicker on slow machines. Needs a repro + fix. Likely a mousemove throttle issue.',
    list: 'In Progress',
  },
  {
    id: 'demo-card-auth-migration',
    name: 'Auth provider migration',
    description: 'Migrate from the legacy auth provider to the new OIDC-compliant service. Parked until next sprint.',
    list: 'In Progress',
  },
  {
    id: 'demo-card-dark-mode',
    name: 'Dark mode',
    description: 'Full dark theme pass across the app. Blocked on design.',
    list: 'Backlog',
  },
  {
    id: 'demo-card-i18n',
    name: 'i18n pass',
    description: 'Localize the UI for FR / DE / JA. Need to switch date formats + pluralization.',
    list: 'Backlog',
  },
  {
    id: 'demo-card-perf',
    name: 'Perf regression investigation',
    description:
      'Users on older Macs report lag after 0.42. Suspected culprit: virtualization threshold on the card list.',
    list: 'Backlog',
  },
  {
    id: 'demo-card-search',
    name: 'Search refactor',
    description: 'Unify the board-search and global-search code paths behind a shared query builder.',
    list: 'Review',
  },
  {
    id: 'demo-card-onboarding',
    name: 'Onboarding redesign',
    description: 'New three-step onboarding that skips sample-data creation for returning users.',
    list: 'Done',
  },
];

export type SeedResult = {
  board: Trello.TrelloBoard;
  cards: Trello.TrelloCard[];
  alreadySeeded: boolean;
};

/**
 * Create the Widgets-team demo board if it doesn't exist, plus 8 realistic
 * cards spread across Backlog / In Progress / Review / Done. Idempotent: if
 * the board is already present the call is a no-op and returns the existing
 * board with its current cards.
 */
export const seedSoftwareTeamFixture = async (db: Database.Database): Promise<SeedResult> => {
  const existingBoards = await db.query(Filter.type(Trello.TrelloBoard)).run();
  const existing = existingBoards.find((board) => board.trelloBoardId === BOARD_ID);
  if (existing) {
    const existingCards = await db.query(Filter.type(Trello.TrelloCard)).run();
    const boardCards = existingCards.filter((card) => card.trelloBoardId === BOARD_ID);
    log.info('demo: fixture already seeded', { cards: boardCards.length });
    return { board: existing, cards: boardCards, alreadySeeded: true };
  }

  const board = db.add(
    Obj.make(Trello.TrelloBoard, {
      name: 'Widgets Team',
      trelloBoardId: BOARD_ID,
      url: 'https://trello.com/b/widgets-demo',
    }),
  );
  await addToDemoCollection(db, board);

  const cards: Trello.TrelloCard[] = [];
  for (const [index, spec] of CARDS.entries()) {
    const card = db.add(
      Obj.make(Trello.TrelloCard, {
        name: spec.name,
        description: spec.description,
        trelloCardId: spec.id,
        trelloBoardId: BOARD_ID,
        trelloListId: `demo-list-${spec.list.toLowerCase().replace(/\s+/g, '-')}`,
        listName: spec.list,
        position: index * 100,
        closed: false,
        lastActivityAt: new Date().toISOString(),
      }),
    );
    cards.push(card);
    await addToDemoCollection(db, card);
  }

  log.info('demo: fixture seeded', { board: board.name, cards: cards.length });
  return { board, cards, alreadySeeded: false };
};
