//
// Copyright 2026 DXOS.org
//

import { type Locator, type Page, expect } from '@playwright/test';

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { type SpaceId } from '@dxos/keys';

import { defineScenario, invokeInPage } from '../perf/scenario.ts';

/** Restated from `@dxos/plugin-projects`, whose module graph does not load under Playwright. */
const SPEC_TYPENAME = 'org.dxos.type.projects.spec';

/** The companion variant `plugin-assistant` registers its chat under (`ASSISTANT_COMPANION_VARIANT`). */
const ASSISTANT_COMPANION = 'assistant-chat';

/** Features on the map: enough cards to click through, each a selection change. */
const FEATURES = 8;

/** Turns in the companion chat, so the thread holds several messages, each its own editor. */
const TURNS = 2;

/** Round trips between the two planks; each is two samples of the per-click cost. */
const SWITCHES = 4;

/** The closing line of the scripted conversation (`src/util/scripted-model.ts`). */
const ASSISTANT_DONE = /ran 20 database queries/;

const PROMPT = 'Survey this spec.';

/** Twenty-one scripted model turns, as the projects flow measured them. */
const ASSISTANT_TIMEOUT = 300_000;

/** Restates `SpaceId`'s predicate (`packages/common/keys/src/space-id.ts`), whose module does not load under Playwright. */
const isSpaceId = (value: unknown): value is SpaceId =>
  typeof value === 'string' && value.startsWith('B') && value.length === 33;

const specPath = (spaceId: string, specId: string): string =>
  GraphPath.getSpacePath(spaceId, GraphPath.GroupSegments.ai, SPEC_TYPENAME, specId);

const companion = (page: Page): Locator => page.getByTestId('deck.companion');

const assistantPrompt = (page: Page): Locator => companion(page).getByTestId('assistant.prompt').locator('.cm-content');

/**
 * Invokes an operation and returns the id at `path` in its output, read in the page: outputs hold live
 * objects, which `page.evaluate` cannot carry back. Falls back to the output's own id.
 */
const invokeForId = (
  page: Page,
  key: string,
  input: unknown,
  path: readonly string[],
  spaceId?: SpaceId,
): Promise<string | undefined> =>
  page.evaluate(
    async ({ key, input, path, spaceId }) => {
      const composer = globalThis.composer;
      if (!composer?.invoke) {
        throw new Error('composer.invoke is unavailable');
      }
      const idOf = (value: unknown): string | undefined => {
        const id = typeof value === 'object' && value !== null ? Reflect.get(value, 'id') : undefined;
        return typeof id === 'string' ? id : undefined;
      };
      const output: unknown = await composer.invoke(key, input, spaceId ? { spaceId } : undefined);
      let value = output;
      for (const segment of path) {
        value = typeof value === 'object' && value !== null ? Reflect.get(value, segment) : undefined;
      }
      return idOf(value) ?? idOf(output);
    },
    { key, input, path, spaceId },
  );

/** Creates the features on the spec's map, in one evaluation: the spec input wants a live ref. */
const createFeatures = (page: Page, spaceId: SpaceId, specId: string, count: number): Promise<void> =>
  page.evaluate(
    async ({ spaceId, specId, count }) => {
      const composer = globalThis.composer;
      const space = globalThis.dxos?.spaces?.().find((candidate) => candidate.id === spaceId);
      if (!composer?.invoke || !space) {
        throw new Error('composer.invoke or the space is unavailable');
      }
      const spec = space.db.makeRef(`echo:///${specId}`);
      for (let index = 0; index < count; index++) {
        await composer.invoke(
          'org.dxos.operation.projects.createFeature',
          { name: `Feature ${index + 1}`, description: `What feature ${index + 1} does when complete.`, spec },
          { spaceId },
        );
      }
    },
    { spaceId, specId, count },
  );

/** One scripted conversation in the open companion chat, to its closing line. */
const runTurn = async (page: Page, turn: number, budget: number): Promise<void> => {
  const prompt = assistantPrompt(page);
  await prompt.click({ timeout: budget });
  await prompt.fill(PROMPT);
  // The editor applies the fill asynchronously; Enter before it lands submits an empty prompt.
  await expect(prompt).toHaveText(PROMPT);
  // A chat that is still settling drops the keypress, so submit until the text leaves the editor.
  await expect(async () => {
    if ((await prompt.innerText()).includes(PROMPT)) {
      await prompt.press('Enter');
    }
    await expect(prompt).not.toContainText(PROMPT, { timeout: 2_000 });
  }).toPass({ timeout: budget });
  await expect(companion(page).getByTestId('assistant.thread').getByText(ASSISTANT_DONE)).toHaveCount(turn, {
    timeout: Math.max(budget, ASSISTANT_TIMEOUT),
  });
};

/** The open plank's companion thread, once it holds `turns` finished conversations. */
const threadSettled = (page: Page, turns: number, budget: number): Promise<void> =>
  expect(companion(page).getByTestId('assistant.thread').getByText(ASSISTANT_DONE)).toHaveCount(turns, {
    timeout: budget,
  });

/** A spec with features, open with the assistant beside it, holding `turns` finished conversations. */
const createSpec = async (page: Page, spaceId: SpaceId, name: string, turns: number, budget: number) => {
  const specId = await invokeForId(page, 'org.dxos.operation.projects.createSpec', { name }, ['spec'], spaceId);
  if (specId === undefined) {
    throw new Error('projects.createSpec returned no spec');
  }
  await createFeatures(page, spaceId, specId, FEATURES);
  await invokeInPage(page, 'org.dxos.operation.appToolkit.open', { subject: [specPath(spaceId, specId)] });
  await expect(page.getByTestId('feature-canvas-node')).toHaveCount(FEATURES, { timeout: budget });
  await invokeInPage(page, 'org.dxos.operation.appToolkit.updateCompanion', {
    subject: `${specPath(spaceId, specId)}/~${ASSISTANT_COMPANION}`,
  });
  await assistantPrompt(page).waitFor({ timeout: budget });
  for (let turn = 1; turn <= turns; turn++) {
    await runTurn(page, turn, budget);
  }
  return specId;
};

let opened: { spaceId: SpaceId; first: string; second: string } | undefined;

// `pnpm perf run --scenario companion-switch` runs it; `pnpm perf scenario check companion-switch` proves it.
defineScenario({
  flow: 'companion-switch',
  reproduces:
    'With the assistant companion open, moving between planks costs 60-430 ms of main-thread work per click, mostly the chat thread destroying and rebuilding its CodeMirror editors (trace 2026-10-29).',
  scale: `features=${FEATURES},turns=${TURNS}`,
  timeoutMs: (2 * TURNS + 1) * ASSISTANT_TIMEOUT,
  fixture: async ({ page, budget }) => {
    const spaceId = await invokeForId(page, 'org.dxos.operation.space.create', { name: 'PERF: Companion' }, ['space']);
    if (!isSpaceId(spaceId)) {
      throw new Error(`space.create returned no space id: ${spaceId}`);
    }
    await invokeInPage(page, 'org.dxos.operation.appToolkit.switchWorkspace', { subject: `root/${spaceId}` });
    await page.waitForURL(new RegExp(`/w/${spaceId}`), { timeout: budget });

    // Two maps, each with its own conversation beside it: the companion stays open and follows the plank.
    const second = await createSpec(page, spaceId, 'Perf spec B', 1, budget);
    const first = await createSpec(page, spaceId, 'Perf spec A', TURNS, budget);
    opened = { spaceId, first, second };
  },
  stages: async ({ page, stage, budget }) => {
    if (!opened) {
      throw new Error('fixture did not open the specs');
    }
    const { spaceId, first, second } = opened;

    // The report's clicks: each one moves to the other plank, and the companion shows that plank's thread.
    await stage('switch-plank', async () => {
      for (let index = 0; index < SWITCHES; index++) {
        await invokeInPage(page, 'org.dxos.operation.appToolkit.open', { subject: [specPath(spaceId, second)] });
        await threadSettled(page, 1, budget);
        await invokeInPage(page, 'org.dxos.operation.appToolkit.open', { subject: [specPath(spaceId, first)] });
        await threadSettled(page, TURNS, budget);
      }
    });

    // Clicks that move nothing: the map's background, where the thread beside it should not render at all.
    await stage('click-canvas', async () => {
      const box = await page.getByTestId('feature-map.canvas').boundingBox({ timeout: budget });
      if (!box) {
        throw new Error('the feature map has no box');
      }
      for (let index = 0; index < SWITCHES; index++) {
        await page.mouse.click(box.x + 12 + index * 4, box.y + box.height - 12);
        await page.waitForTimeout(400);
      }
    });
  },
});
