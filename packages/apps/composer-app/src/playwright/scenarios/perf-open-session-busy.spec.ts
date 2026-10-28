//
// Copyright 2026 DXOS.org
//

import { type Locator, type Page, expect } from '@playwright/test';

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { type SpaceId } from '@dxos/keys';
import { PERF_OFFLINE } from '@dxos/perf-harness';

import { describeReplication, waitForReplication } from '../perf/replication.ts';
import { defineScenario, invokeInPage } from '../perf/scenario.ts';

/** Restated from `@dxos/compute`, whose module graph does not load under Playwright. */
const PROJECT_TYPENAME = 'org.dxos.type.project';

/** The companion variant `plugin-assistant` registers its chat under (`ASSISTANT_COMPANION_VARIANT`). */
const ASSISTANT_COMPANION = 'assistant-chat';

/** Chats seeded with one scripted turn each, so the space holds many chat feeds with history. */
const SEEDED_CHATS = 12;

/** The closing line of the scripted conversation (`src/util/scripted-model.ts`). */
const ASSISTANT_DONE = /ran 20 database queries/;

const PROMPT = 'Survey this project.';

/** Twenty-one scripted model turns, as the projects flow measured them. */
const ASSISTANT_TIMEOUT = 300_000;

/**
 * Restates `SpaceId`'s predicate (`packages/common/keys/src/space-id.ts`), whose module does not load
 * under Playwright: RFC4648 base-32, multibase 'B' prefix, 33 characters.
 */
const isSpaceId = (value: unknown): value is SpaceId =>
  typeof value === 'string' && value.startsWith('B') && value.length === 33;

const projectPath = (spaceId: string, projectId: string): string =>
  GraphPath.getSpacePath(spaceId, GraphPath.GroupSegments.ai, PROJECT_TYPENAME, projectId);

const assistantPrompt = (page: Page): Locator =>
  page.getByTestId('deck.companion').getByTestId('assistant.prompt').locator('.cm-content');

const threadDone = (page: Page): Locator =>
  page.getByTestId('deck.companion').getByTestId('assistant.thread').getByText(ASSISTANT_DONE);

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

/** A database write needs the space in the invocation; the active workspace is not enough. */
const createProject = async (page: Page, spaceId: SpaceId, name: string): Promise<string> => {
  const projectId = await invokeForId(page, 'org.dxos.operation.projects.create', { name }, ['project'], spaceId);
  if (projectId === undefined) {
    throw new Error('projects.create returned no project');
  }
  return projectId;
};

const openProject = async (page: Page, spaceId: string, projectId: string): Promise<void> => {
  await invokeInPage(page, 'org.dxos.operation.appToolkit.open', { subject: [projectPath(spaceId, projectId)] });
};

/** Opens the project's companion chat, which creates it on first open. */
const openSession = async (page: Page, spaceId: string, projectId: string, budget: number): Promise<void> => {
  await invokeInPage(page, 'org.dxos.operation.appToolkit.updateCompanion', {
    subject: `${projectPath(spaceId, projectId)}/~${ASSISTANT_COMPANION}`,
  });
  await assistantPrompt(page).waitFor({ timeout: budget });
  // The companion swaps chats after the prompt appears; the previous project's thread already holds the closing line.
  await expect(threadDone(page)).toHaveCount(0, { timeout: budget });
};

/** One scripted conversation in the open companion chat, to its closing line. */
const runTurn = async (page: Page, budget: number): Promise<void> => {
  const prompt = assistantPrompt(page);
  await prompt.click({ timeout: budget });
  await prompt.fill(PROMPT);
  // The editor applies the fill asynchronously; Enter before it lands submits an empty prompt.
  await expect(prompt).toHaveText(PROMPT);
  // A chat that is still settling drops the keypress, so submit until the text leaves the editor (an
  // empty editor shows a placeholder, so emptiness is not the signal).
  await expect(async () => {
    if ((await prompt.innerText()).includes(PROMPT)) {
      await prompt.press('Enter');
    }
    await expect(prompt).not.toContainText(PROMPT, { timeout: 2_000 });
  }).toPass({ timeout: budget });
  await threadDone(page).waitFor({ timeout: Math.max(budget, ASSISTANT_TIMEOUT) });
};

let opened: { spaceId: SpaceId; projectId: string } | undefined;

// `pnpm perf run --scenario open-session-busy` runs it; `pnpm perf scenario check open-session-busy` proves it.
defineScenario({
  flow: 'open-session-busy',
  reproduces:
    'Opening a Claude Code session in a space with many chat histories stalls: the new chat feed query reads every message in the space and the worker stays saturated (trace 2026-10-24).',
  scale: `chats=${SEEDED_CHATS}`,
  // Each seeded turn is ~20 s of scripted model turns; the stages add one more.
  timeoutMs: (SEEDED_CHATS + 1) * ASSISTANT_TIMEOUT,
  fixture: async ({ page, runId, budget }) => {
    // `space.create` returns the space under `space` in some paths and bare in others, as the projects fixture reads it.
    const input = { name: `PERF: Sessions ${runId}` };
    const spaceId = await invokeForId(page, 'org.dxos.operation.space.create', input, ['space']);
    if (!isSpaceId(spaceId)) {
      throw new Error(`space.create returned no space id: ${spaceId}`);
    }
    await invokeInPage(page, 'org.dxos.operation.appToolkit.switchWorkspace', { subject: `root/${spaceId}` });
    await page.waitForURL(new RegExp(`/w/${spaceId}`), { timeout: budget });

    // One project per seeded chat: each companion chat is the project's own, so every turn lands in a new feed.
    for (let index = 0; index < SEEDED_CHATS; index++) {
      const projectId = await createProject(page, spaceId, `Seeded project ${index + 1}`);
      await openProject(page, spaceId, projectId);
      await openSession(page, spaceId, projectId, budget);
      await runTurn(page, budget);
    }

    // The session the stages open starts empty, while every other chat in the space has history.
    const projectId = await createProject(page, spaceId, 'Perf session project');
    await openProject(page, spaceId, projectId);
    // The seeded chats replicate to EDGE in the background; waiting here keeps that I/O out of the stages.
    // `--offline` leaves no EDGE peer to wait for.
    if (!PERF_OFFLINE) {
      const replication = await waitForReplication(page, spaceId, { timeoutMs: 180_000 });
      if (replication.outcome === 'timeout') {
        throw new Error(describeReplication(replication));
      }
    }
    opened = { spaceId, projectId };
  },
  stages: async ({ page, stage, budget }) => {
    if (!opened) {
      throw new Error('fixture did not open a project');
    }
    const { spaceId, projectId } = opened;

    // The report's step: a new session, created and shown beside the project.
    await stage('open-session', async () => {
      await openSession(page, spaceId, projectId, budget);
    });

    // The session at work: each streamed message re-runs the chat's feed query.
    await stage('first-turn', async () => {
      await runTurn(page, budget);
    });
  },
});
