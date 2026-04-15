//
// Copyright 2026 DXOS.org
//

/**
 * Load a JSON fixture by name from `tools/demo/fixtures/`. Drives the Trello
 * populator and the "card drift" step of the orchestrator so swapping demo
 * scenarios (e.g. software-team vs. product-team vs. VC-deal-flow) is a
 * one-JSON-file change, no code edits.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEMO_DIR = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(DEMO_DIR, '..', 'fixtures');

export type FixtureCard = {
  readonly name: string;
  readonly desc: string;
  readonly list: string;
};

export type Fixture = {
  readonly id: string;
  readonly boardName: string;
  readonly description: string;
  readonly lists: readonly string[];
  readonly cards: readonly FixtureCard[];
  /** Card to move during the orchestrator's "simulate drift" step. */
  readonly drift?: { readonly card: string; readonly from: string; readonly to: string };
};

const DEFAULT_FIXTURE = 'widgets';

/** Load a fixture by id; DEMO_FIXTURE env var overrides the default. */
export const loadFixture = (id: string = process.env.DEMO_FIXTURE ?? DEFAULT_FIXTURE): Fixture => {
  const path = resolve(FIXTURES_DIR, `${id}.json`);
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(raw) as Fixture;
};
