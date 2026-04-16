//
// Copyright 2026 DXOS.org
//

import { type Database, Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { Granola } from '@dxos/plugin-granola/types';
import { Trello } from '@dxos/plugin-trello/types';

import { addToDemoCollection, ensureDemoCollection } from './collection';
import { seedSoftwareTeamFixture } from './seed-fixture';

/**
 * Keys Playwright (or the user) sets in localStorage before running the
 * bootstrap. Mirror of .env.demo so the Playwright script can proxy each
 * variable via `page.evaluate(() => localStorage.setItem(key, value))`.
 */
export const BOOTSTRAP_KEYS = {
  anthropicApiKey: 'ANTHROPIC_API_KEY',
  trelloApiKey: 'TRELLO_API_KEY',
  trelloApiToken: 'TRELLO_API_TOKEN',
  trelloBoardId: 'TRELLO_BOARD_ID',
  granolaApiKey: 'GRANOLA_API_KEY',
  slackBotToken: 'SLACK_BOT_TOKEN',
  slackChannels: 'SLACK_CHANNELS',
  githubPat: 'GITHUB_PAT',
  githubRepo: 'GITHUB_REPO',
  demoPersonaName: 'DEMO_PERSONA_NAME',
  demoOrgName: 'DEMO_ORG_NAME',
} as const;

const readLocalStorage = (key: string): string | undefined => {
  if (typeof globalThis.localStorage === 'undefined') {
    return undefined;
  }
  const value = globalThis.localStorage.getItem(key);
  return value && value.length > 0 ? value : undefined;
};

export type BootstrapResult = {
  created: string[];
  skipped: string[];
  errors: string[];
};

/**
 * Reads credentials from localStorage (typically populated by the Playwright
 * setup script from .env.demo) and creates / updates the ECHO objects the
 * demo depends on:
 *
 * - Widgets-team TrelloBoard + 8 seed cards (if no board yet)
 * - TrelloBoard with real apiKey + token if TRELLO_* env vars are set
 * - GranolaAccount with real apiKey if GRANOLA_API_KEY is set
 *
 * Slack settings and GitHub account are intentionally left to their own
 * plugin surfaces — they live in atoms / AccessTokens, not single-space
 * objects, so Playwright should write them separately after login.
 *
 * Idempotent: if an object already exists with matching credentials, this
 * is a no-op for that slot.
 */
export const bootstrapFromEnv = async (db: Database.Database): Promise<BootstrapResult> => {
  const result: BootstrapResult = { created: [], skipped: [], errors: [] };

  // Ensure the demo collection exists up-front so everything subsequent
  // lands in it and shows up in the Composer sidebar.
  await ensureDemoCollection(db);

  // Always seed the sample board first so match targets exist.
  try {
    const seeded = await seedSoftwareTeamFixture(db);
    if (seeded.alreadySeeded) {
      result.skipped.push('Widgets-team fixture (already present)');
    } else {
      result.created.push(`Widgets-team board + ${seeded.cards.length} cards`);
    }
  } catch (err) {
    result.errors.push(`seed fixture: ${String(err)}`);
  }

  // Real Trello credentials → create a TrelloBoard object pointing at the user's actual board.
  const trelloApiKey = readLocalStorage(BOOTSTRAP_KEYS.trelloApiKey);
  const trelloApiToken = readLocalStorage(BOOTSTRAP_KEYS.trelloApiToken);
  const trelloBoardId = readLocalStorage(BOOTSTRAP_KEYS.trelloBoardId);
  if (trelloApiKey && trelloApiToken && trelloBoardId) {
    try {
      const existing = (await db.query(Filter.type(Trello.TrelloBoard)).run()).find(
        (board) => board.trelloBoardId === trelloBoardId,
      );
      if (existing) {
        Obj.change(existing, (mutable) => {
          mutable.apiKey = trelloApiKey;
          mutable.apiToken = trelloApiToken;
        });
        result.skipped.push(`Trello board ${trelloBoardId} (updated credentials)`);
      } else {
        const board = db.add(
          Trello.makeBoard({ trelloBoardId, apiKey: trelloApiKey, apiToken: trelloApiToken }),
        );
        await addToDemoCollection(db, board);
        result.created.push(`Trello board ${trelloBoardId}`);
      }
    } catch (err) {
      result.errors.push(`trello board: ${String(err)}`);
    }
  } else {
    result.skipped.push('Trello (no credentials in localStorage)');
  }

  // Real Granola credentials → create GranolaAccount.
  const granolaApiKey = readLocalStorage(BOOTSTRAP_KEYS.granolaApiKey);
  if (granolaApiKey) {
    try {
      const existing = (await db.query(Filter.type(Granola.GranolaAccount)).run())[0];
      if (existing) {
        Obj.change(existing, (mutable) => {
          mutable.apiKey = granolaApiKey;
        });
        result.skipped.push('Granola account (updated credentials)');
      } else {
        const account = db.add(Granola.makeAccount({ apiKey: granolaApiKey }));
        await addToDemoCollection(db, account);
        result.created.push('Granola account');
      }
    } catch (err) {
      result.errors.push(`granola account: ${String(err)}`);
    }
  } else {
    result.skipped.push('Granola (no credentials in localStorage)');
  }

  log.info('demo: bootstrap complete', result);
  return result;
};
