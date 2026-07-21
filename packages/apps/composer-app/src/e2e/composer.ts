//
// Copyright 2026 DXOS.org
//

import {
  type Action,
  type ConsoleMessage,
  type InferStagehandSchema,
  type Page,
  type StagehandZodSchema,
} from '@browserbasehq/stagehand';
import { z } from 'zod';

import { Trigger } from '@dxos/async';

import { type SessionOptions, createSession } from './session';

export const INITIAL_URL = process.env.DX_E2E_BASE_URL ?? 'http://localhost:4173';

// Only the personal space is seeded on every new identity. The exemplar space is skipped on
// localhost (see OnboardingPlugin `generateExemplarSpace`), which is where e2e tests run.
export const INITIAL_SPACE_COUNT = 1;

export type ActOptions = {
  /** Substituted for %name% placeholders in the instruction (kept out of the LLM prompt). */
  variables?: Record<string, string>;
};

/**
 * One Composer client: an isolated Stagehand browser session already booted into the
 * app. Tests drive it with plain-language `act` steps and assert via schema-driven
 * `extract` — there is deliberately no selector layer here.
 */
export type Peer = {
  page: Page;
  /** Perform a plain-language UI action; throws when the model reports failure. */
  act: (instruction: string, options?: ActOptions) => Promise<void>;
  /** Extract structured state from the current UI. */
  extract: <T extends StagehandZodSchema>(instruction: string, schema: T) => Promise<InferStagehandSchema<T>>;
  /** Resolve candidate elements for an instruction (for coordinate-level input like drag & drop). */
  observe: (instruction: string) => Promise<Action[]>;
  /** Invitation code captured from the app's console output after creating an invitation. */
  invitationCode: () => Promise<string>;
  /** Auth code captured from the app's console output during an invitation flow. */
  authCode: () => Promise<string>;
  close: () => Promise<void>;
};

/**
 * Launch a peer and wait for the app to finish booting (identity auto-created).
 */
export const createPeer = async (options: SessionOptions = {}): Promise<Peer> => {
  const session = await createSession(options);
  const { stagehand, page } = session;

  const invitationCode = new Trigger<string>();
  const authCode = new Trigger<string>();
  page.on('console', (message: ConsoleMessage) => {
    try {
      const text = message.text();
      const json = JSON.parse(text.slice(text.indexOf('{')));
      if (json.invitationCode) {
        invitationCode.wake(json.invitationCode);
      }
      if (json.authCode) {
        authCode.wake(json.authCode);
      }
    } catch {}
  });

  await page.goto(INITIAL_URL);
  await waitForAppReady(page);

  return {
    page,
    act: async (instruction, options) => {
      const started = Date.now();
      const result = await stagehand.act(instruction, { page, ...options });
      // The resolved action is the only record of what the model actually did — log it
      // (with duration: sub-second acts are cache replays) so runs can be diagnosed
      // from CI output.
      // eslint-disable-next-line no-console
      console.log(
        `[act] ${Date.now() - started}ms ${instruction} -> ${result.success ? result.actionDescription : `FAILED: ${result.message}`}`,
      );
      if (!result.success) {
        throw new Error(`act failed: ${instruction} — ${result.message}`);
      }
    },
    // Single-shot by design: a misread or schema failure surfaces as a test failure so
    // the suite's flake rate stays measurable. (The AI SDK still repairs malformed JSON
    // and retries transport errors internally — those are not assertion retries.)
    extract: (instruction, schema) => stagehand.extract(instruction, schema, { page }),
    observe: (instruction) => stagehand.observe(instruction, { page }),
    invitationCode: () => invitationCode.wait({ timeout: 30_000 }),
    authCode: () => authCode.wait({ timeout: 30_000 }),
    close: session.close,
  };
};

/**
 * Deterministic page-state gate shared by the waitFor* helpers below. Only cheap DOM
 * probes go through here — never LLM extractions, which are single-shot assertions.
 */
const waitForCondition = async (
  probe: () => Promise<boolean>,
  message: string,
  timeout: number,
  interval = 250,
): Promise<void> => {
  const deadline = Date.now() + timeout;
  for (;;) {
    if (await probe().catch(() => false)) {
      return;
    }
    if (Date.now() >= deadline) {
      throw new Error(`Timed out after ${timeout}ms — ${message}.`);
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
};

/**
 * Wait for Composer's post-boot UI. This is the one deterministic marker the suite
 * keeps: boot gating with an LLM round-trip would add model latency to every test and
 * to the startup benchmarks, which time this exact transition. Boot is CPU-bound
 * (identity creation, storage init) and every worker boots peers at the start of its
 * file, so the budget must absorb all workers' browsers booting at once.
 */
export const waitForAppReady = (page: Page, timeout = 180_000): Promise<void> =>
  waitForCondition(
    () => page.evaluate(() => document.querySelector('[data-testid="treeView.userAccount"]') !== null),
    'Composer finished booting',
    timeout,
  );


//
// Shared flows — plain-language step sequences used across specs. These are not a
// selector abstraction; they exist only to avoid repeating the same prose steps.
//

/**
 * Create a new space via the sidebar's app menu.
 */
export const createSpace = async (peer: Peer): Promise<void> => {
  await peer.act('Click the "App menu" button at the top of the left sidebar');
  await peer.act('Click the "Create space" option in the open menu');
  await peer.act('Click the "Save" button in the "Create Space" dialog');
  // Space creation navigates to the new space; let the tree settle before the next step.
  await peer.page.waitForTimeout(1_500);
};

/**
 * Create an object of the given type in the current space via the add-to-space picker.
 * Some types (e.g. Collection) open a naming dialog that must be saved; others (e.g.
 * Document) create instantly. Types with bespoke setup forms (e.g. Table) handle those
 * in their spec.
 */
export const createObject = async (peer: Peer, type: string): Promise<void> => {
  await peer.act('Click the "Add to space" plus button in the sidebar');
  await peer.act(`Click the "${type}" option in the list of item types that opened`);
  await peer.page.waitForTimeout(1_500);
  const { dialogOpen } = await peer.extract(
    'Is a modal dialog with a "Save" button currently open?',
    z.object({ dialogOpen: z.boolean() }),
  );
  if (dialogOpen) {
    await peer.act('Click the "Save" button in the open dialog');
    await peer.page.waitForTimeout(1_500);
  }
};

/**
 * Focus the document body editor through the `window.composer` test hook.
 */
export const focusEditor = async (peer: Peer): Promise<void> => {
  await waitForCondition(
    () => peer.page.evaluate(() => Boolean((window as any).composer?.editorView)),
    'markdown editor mounted',
    15_000,
    500,
  );
  await peer.page.evaluate(() => (window as any).composer.editorView.focus());
};

/**
 * Focus the document body editor and type text with the real keyboard. Focus goes
 * through the `window.composer` test hook (AI-targeting the body vs. the title input is
 * unreliable) and the content through CDP key events, so precise strings are not
 * subject to model transcription.
 */
export const typeInEditor = async (peer: Peer, text: string): Promise<void> => {
  await focusEditor(peer);
  await peer.page.type(text);
  await peer.page.waitForTimeout(500);
};

/**
 * Wait for an input whose placeholder matches the pattern. Like `waitForAppReady`, a
 * deterministic gate for shell boot transitions (post-reset reload into the invitation
 * shell): extract-polling this window puts heavy snapshot work into the app's identity
 * bootstrap.
 */
export const waitForInput = (page: Page, placeholder: RegExp, timeout = 90_000): Promise<void> =>
  waitForCondition(
    () =>
      page.evaluate(
        (pattern: string) =>
          [...document.querySelectorAll('input')].some((input) => new RegExp(pattern, 'i').test(input.placeholder)),
        placeholder.source,
      ),
    `input matching ${placeholder} mounted`,
    timeout,
    500,
  );

/**
 * Wait for the invitation flow's verification (auth code) input to mount — it appears
 * only once the peer connection is established, on a timescale the fixed act cadence
 * cannot anticipate.
 */
export const waitForAuthCodeInput = async (page: Page, timeout = 60_000): Promise<void> => {
  // The input mounts disabled and enables once the invitation state machine reaches
  // the authentication step.
  await waitForCondition(
    () =>
      page.evaluate(
        () =>
          document.querySelector(
            '[data-testid="halo-auth-code-input"]:not([disabled]), [data-testid="space-auth-code-input"]:not([disabled])',
          ) !== null,
      ),
    'verification code input enabled',
    timeout,
    500,
  );
  // Let the panel finish rendering so the following action's snapshot includes it.
  await page.waitForTimeout(1_500);
};

/**
 * Documents auto-reveal on creation but items can otherwise sit under the "Collections"
 * section, which starts collapsed — expand it so tree items are visible. The disclosure
 * state lives in aria-expanded, which extraction cannot see (a collapsed section and an
 * expanded-but-empty one render identically), so the state is read from the DOM while
 * the expansion itself stays a plain-language action.
 */
export const expandCollections = async (peer: Peer): Promise<void> => {
  const expanded = () =>
    peer.page.evaluate(
      () =>
        document
          .querySelector('[data-testid="spacePlugin.collectionsSection"] button[aria-expanded]')
          ?.getAttribute('aria-expanded') === 'true',
    );
  if (!(await expanded())) {
    await peer.act(
      'Click the toggle button of the "Collections" section in the space sidebar tree (accessible label "Click to open Collections")',
    );
    await waitForCondition(expanded, 'Collections section expanded', 10_000, 500);
  }
};

/**
 * Count the spaces (workspace roots) currently listed in the sidebar rail. The rail
 * renders spaces as avatar icons whose names are not reliably part of the rendered
 * text an extraction sees (a freshly replicated space consistently goes uncounted), so
 * this reads the rail from the DOM — like the boot marker, a deterministic gate rather
 * than a selector-driven interaction.
 */
export const countSpaces = (peer: Peer): Promise<number> =>
  peer.page.evaluate(() => document.querySelectorAll('[data-testid="spacePlugin.space"]').length);

/**
 * Current text of the markdown editor via CodeMirror's own state (empty string when the
 * editor is not mounted). The deterministic probe for content-replication waits.
 */
export const editorContent = (peer: Peer): Promise<string> =>
  peer.page.evaluate(() => (window as any).composer?.editorView?.state.doc.toString() ?? '');

/**
 * Select a text range in the markdown editor through CodeMirror's own API. Character-
 * precise selection (required by the comments plugin's anchoring) is not expressible as
 * a pointer gesture, so this goes through the `window.composer` test hook.
 */
export const selectEditorText = async (page: Page, text: string): Promise<void> => {
  // TODO(wittjosiah): If selection happens too fast, the comment button is not enabled.
  await page.waitForTimeout(1_000);
  const result = await page.evaluate((target: string) => {
    const view = (window as any).composer?.editorView;
    if (!view) {
      return 'editor not mounted';
    }
    const doc = view.state.doc.toString();
    const pos = doc.indexOf(target);
    if (pos < 0) {
      return `text not found in ${JSON.stringify(doc.slice(0, 200))}`;
    }
    view.dispatch({ selection: { anchor: pos, head: pos + target.length } });
    return 'ok';
  }, text);
  if (result !== 'ok') {
    throw new Error(`selectEditorText(${JSON.stringify(text)}): ${result}`);
  }
};

/**
 * Drag one element onto another, resolving both from plain-language descriptions via
 * `observe`. The raw CDP input sequence keeps the settle times pragmatic-drag-and-drop
 * needs after mousedown and before mouseup.
 */
export const dragBetween = async (
  peer: Peer,
  fromDescription: string,
  toDescription: string,
  offset: { x: number; y: number } = { x: 0, y: 0 },
): Promise<void> => {
  const [from] = await peer.observe(fromDescription);
  const [to] = await peer.observe(toDescription);
  if (!from || !to) {
    throw new Error(`Could not resolve drag endpoints: ${fromDescription} → ${toDescription}`);
  }
  const box = (selector: string) =>
    peer.page.evaluate((xpath: string) => {
      const node = document.evaluate(
        xpath.replace(/^xpath=/, ''),
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null,
      ).singleNodeValue as HTMLElement | null;
      if (!node) {
        return null;
      }
      node.scrollIntoView({ block: 'nearest' });
      const rect = node.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    }, selector);
  const fromPoint = await box(from.selector);
  const toPoint = await box(to.selector);
  if (!fromPoint || !toPoint) {
    throw new Error(`Could not resolve drag coordinates: ${fromDescription} → ${toDescription}`);
  }
  const target = { x: toPoint.x + offset.x, y: toPoint.y + offset.y };

  await peer.page.hover(fromPoint.x, fromPoint.y);
  await peer.page.sendCDP('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    x: fromPoint.x,
    y: fromPoint.y,
    button: 'left',
    buttons: 1,
    clickCount: 1,
  });
  await peer.page.waitForTimeout(100);
  const steps = 4;
  for (let step = 1; step <= steps; step++) {
    await peer.page.sendCDP('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: fromPoint.x + ((target.x - fromPoint.x) * step) / steps,
      y: fromPoint.y + ((target.y - fromPoint.y) * step) / steps,
      button: 'left',
      buttons: 1,
    });
    await peer.page.waitForTimeout(50);
  }
  await peer.page.waitForTimeout(100);
  await peer.page.sendCDP('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    x: target.x,
    y: target.y,
    button: 'left',
    buttons: 1,
    clickCount: 1,
  });
};
