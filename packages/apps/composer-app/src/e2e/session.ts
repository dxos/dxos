//
// Copyright 2026 DXOS.org
//

import { AISdkClient, type Page, Stagehand, getAISDKLanguageModel } from '@browserbasehq/stagehand';

export type SessionOptions = {
  /** Overrides STAGEHAND_HEADED-derived default. */
  headless?: boolean;
  viewport?: { width: number; height: number };
  /** Persist the browser profile across launches (warm-start scenarios). */
  userDataDir?: string;
};

export type Session = {
  stagehand: Stagehand;
  page: Page;
  close: () => Promise<void>;
};

/**
 * Model driving Stagehand's act/extract/observe. The suite is written in plain-language
 * steps, so a model API key is required (ANTHROPIC_API_KEY for the default model).
 * Override with STAGEHAND_MODEL (e.g. `openai/gpt-4.1-mini`) plus that provider's key.
 * Sonnet is the default: haiku's element resolution missed hover-revealed and freshly
 * mounted controls often enough to make the multi-peer suites flaky.
 */
const resolveModel = (): string => process.env.STAGEHAND_MODEL ?? 'anthropic/claude-sonnet-4-6';

/**
 * Stagehand leaves temperature at the provider default (1.0 for Anthropic), which makes
 * extraction/action inference sampling-dependent. The suite runs without retries so
 * every assertion is single-shot — pin temperature 0 to remove that variance.
 */
const createLlmClient = (): AISdkClient => {
  const [provider, ...modelParts] = resolveModel().split('/');
  const languageModel = getAISDKLanguageModel(provider, modelParts.join('/'), undefined, {
    transformParams: async ({ params }) => ({ ...params, temperature: 0 }),
  });
  return new AISdkClient({ model: languageModel });
};

/**
 * Launch a local Stagehand-driven browser session. Each session is an isolated
 * chromium instance with a fresh (or explicitly persisted) profile, mirroring the
 * per-test browser-context isolation of the previous playwright suite.
 */
export const createSession = async (options: SessionOptions = {}): Promise<Session> => {
  const stagehand = new Stagehand({
    env: 'LOCAL',
    // Pino spawns worker threads that outlive vitest workers and keep the process alive.
    disablePino: true,
    verbose: 0,
    model: resolveModel(),
    llmClient: createLlmClient(),
    // Persist resolved actions: a cache hit replays the recorded action deterministically
    // (no inference); a stale entry self-heals by re-inferring and refreshing. Keys
    // include the page URL, so only stable-URL steps hit across runs (Composer paths
    // embed per-run space ids).
    cacheDir: new URL('../../node_modules/.cache/stagehand-e2e', import.meta.url).pathname,
    localBrowserLaunchOptions: {
      headless: options.headless ?? process.env.STAGEHAND_HEADED !== '1',
      viewport: options.viewport ?? { width: 1280, height: 720 },
      ...(options.userDataDir ? { userDataDir: options.userDataDir, preserveUserDataDir: true } : {}),
    },
  });
  await stagehand.init();
  const page = await stagehand.context.awaitActivePage();
  return {
    stagehand,
    page,
    close: async () => {
      await stagehand.close().catch(() => {});
    },
  };
};
