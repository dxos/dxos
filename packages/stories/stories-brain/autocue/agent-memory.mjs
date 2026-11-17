//
// Copyright 2026 DXOS.org
//

/**
 * A reference model of Cloudflare Agent Memory, driven end to end: two chat sessions are ingested through a
 * queue, extracted into typed memories, deduplicated by topic key (a revised preference supersedes the old
 * one), and recalled through four fused retrievers. Built from the docs and the binding's published types,
 * since the private-beta service refuses our account.
 *
 * @title Agent Memory, modelled
 * @mdl packages/stories/stories-brain/docs/AGENT-MEMORY.mdl test QA-1
 * @app storybook-react, narrowed to stories-brain, as a static build:
 *
 *   cd tools/storybook-react && DX_STORIES=stories/stories-brain VITE_DX_DISABLE_ANIMATIONS=true \
 *     npx storybook build --output-dir=out/agent-memory
 *   python3 -m http.server 9021 --directory tools/storybook-react/out/agent-memory
 *   node .agents/skills/autocue/scripts/driver.mjs --port 7333 --theme dark --out /tmp/demo \
 *     --url 'http://127.0.0.1:9021/iframe.html?id=stories-stories-brain-agentmemory--default&viewMode=story'
 */

const SUBTITLE = 'stories-brain/docs/AGENT-MEMORY.mdl · QA-1';

const caption = async (demo, value) => {
  await demo.caption({ value, subtitle: SUBTITLE });
  await demo.sleep({ ms: 1_800 });
};

const testId = (id) => `[data-testid="${id}"]`;

const drain = async (demo, page) => {
  await demo.click({ selector: testId('agent-memory.drain'), label: 'Process queue' });
  await page.locator(testId('agent-memory.stage.4')).waitFor({ timeout: 10_000 });
  await demo.sleep({ ms: 2_500 });
};

export const steps = [
  {
    name: 'Load the story',
    setup: true,
    run: async ({ demo, page }) => {
      await demo.goto({});
      await page.locator(testId('agent-memory.ingest.1')).waitFor({ timeout: 60_000 });
      await demo.cut();
    },
  },
  {
    name: 'Ingest the first session',
    narration: 'ingest() only enqueues the conversation; nothing is stored until the queue is processed.',
    run: async ({ demo, page }) => {
      await demo.title({
        value: 'Agent Memory, modelled',
        subtitle: 'Cloudflare Agent Memory · reference model',
        hold: 3_600,
      });
      await caption(demo, 'ingest() enqueues the conversation and returns');
      await demo.click({ selector: testId('agent-memory.ingest.1'), label: 'ingest()' });
      await page.locator(`${testId('agent-memory.drain')}:has-text("(1)")`).waitFor({ timeout: 5_000 });
      await demo.sleep({ ms: 1_500 });
    },
  },
  {
    name: 'Process the queue',
    narration: 'A consumer extracts typed memories, keys them by topic, dedupes and indexes them.',
    run: async ({ demo, page }) => {
      await caption(demo, 'The consumer: store messages, extract + classify, dedupe by topic key, index');
      await drain(demo, page);
      const inserts = await page.locator(`${testId('agent-memory.stage.3')} >> text=insert`).count();
      if (inserts !== 6) {
        throw new Error(`expected 6 inserts, saw ${inserts}`);
      }
    },
  },
  {
    name: 'Ingest the second session',
    narration: 'A week later Dana prefers Rust: same topic key, so the old fact is superseded, not duplicated.',
    run: async ({ demo, page }) => {
      await caption(demo, 'Session 2 revises a preference: same topic key → supersede');
      await demo.click({ selector: testId('agent-memory.ingest.2'), label: 'ingest()' });
      await drain(demo, page);
      await page.locator(`${testId('agent-memory.stage.3')} >> text=supersede`).waitFor({ timeout: 5_000 });
    },
  },
  {
    name: 'Re-ingest is idempotent',
    narration: 'Messages are content-addressed, so re-ingesting a session stores and extracts nothing.',
    run: async ({ demo, page }) => {
      await caption(demo, 'Messages are content-addressed: re-ingest is a no-op');
      await demo.click({ selector: testId('agent-memory.ingest.1'), label: 're-ingest()' });
      await drain(demo, page);
      await page.locator(`${testId('agent-memory.stage.1')} >> text=0 stored, 6 already present`).waitFor({
        timeout: 5_000,
      });
    },
  },
  {
    name: 'Inspect the rows',
    narration: 'Rows carry ULIDs and a hidden topic key; superseded versions stay but are hidden from list().',
    run: async ({ demo, page }) => {
      await caption(demo, 'Rows: ULID ids, hidden topic_key; the superseded version is kept, struck through');
      await demo.click({ selector: testId('agent-memory.view.table'), label: 'Rows' });
      await page
        .locator(`${testId('agent-memory.table')} tr.line-through`)
        .first()
        .waitFor({ timeout: 5_000 });
      await demo.sleep({ ms: 3_000 });
    },
  },
  {
    name: 'Recall a revised fact',
    narration: 'Recall fuses keyword, topic, vector and raw-message retrievers, then writes an answer.',
    run: async ({ demo, page }) => {
      await caption(demo, 'recall(): four retrievers, rank fusion, then a synthesized answer');
      await demo.click({ selector: testId('agent-memory.query.1'), label: 'recall()' });
      await page.locator(`${testId('agent-memory.answer')} >> text=Rust`).waitFor({ timeout: 5_000 });
      await demo.sleep({ ms: 3_000 });
    },
  },
  {
    name: 'Recall events',
    narration: 'Events accumulate rather than supersede, so the deploy and the rollback both come back.',
    run: async ({ demo, page }) => {
      await caption(demo, 'Events accumulate: the deploy and the rollback both come back');
      await demo.click({ selector: testId('agent-memory.query.2'), label: 'recall()' });
      await page.locator(`${testId('agent-memory.answer')} >> text=Rolled back`).waitFor({ timeout: 5_000 });
      await demo.sleep({ ms: 3_000 });
    },
  },
  {
    name: 'Recall with no match',
    narration:
      'With nothing relevant, recall returns an empty answer instead of inventing one. The real service keeps this behind one isolated store per profile.',
    run: async ({ demo, page }) => {
      await caption(demo, 'Nothing relevant → empty answer, no hallucination');
      await demo.click({ selector: testId('agent-memory.query.4'), label: 'recall()' });
      await page.locator(`${testId('agent-memory.answer')} >> text=nothing matched`).waitFor({ timeout: 5_000 });
      await demo.sleep({ ms: 6_000 });
    },
  },
];
