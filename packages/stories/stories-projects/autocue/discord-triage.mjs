//
// Copyright 2026 DXOS.org
//

/**
 * The DXOS Discord #general channel, replayed from a recording, triaged into a project message by message.
 *
 * @mdl packages/plugins/plugin-projects/PLUGIN.mdl test QA-6
 * @app storybook via `DX_STORIES=stories/stories-projects VITE_DX_DISABLE_ANIMATIONS=true moon run storybook-react:serve`
 *   on :9009, story `/iframe.html?id=stories-stories-projects-discordtriage--default&viewMode=story`
 */

const PLAY = '[data-testid="channel-triage.play"]';
const TOTALS = '[data-testid="channel-triage.totals"]';
const MESSAGES = '[data-testid="channel-triage.messages"]';

export const steps = [
  {
    name: 'Load the story',
    setup: true,
    run: async ({ page }) => {
      await page.locator(PLAY).waitFor({ state: 'visible', timeout: 60_000 });
      await page.waitForFunction((selector) => !document.querySelector(selector)?.hasAttribute('disabled'), PLAY, {
        timeout: 60_000,
      });
      // The project opens on Overview; the tasks it receives are what the take is about.
      await page.getByRole('tab', { name: 'Tasks' }).click();
    },
  },
  {
    name: 'Replay the channel',
    narration: 'Messages from the DXOS Discord arrive one at a time, and each is triaged as it lands.',
    run: async ({ demo, page }) => {
      await demo.title({ value: 'Discord → project', subtitle: 'answers to review, work as tasks', hold: 3_000 });
      await demo.caption({
        value: 'Recorded messages from the DXOS Discord #general channel',
        subtitle: 'QA-6 · plugin-projects/PLUGIN.mdl · model scripted for the demo',
      });
      await demo.click({ selector: PLAY, label: 'Replay channel' });
      await page.locator(MESSAGES).getByText('Triaging…').first().waitFor({ state: 'visible', timeout: 10_000 });
    },
  },
  {
    name: 'Watch a question become a reply to review',
    narration: 'A question becomes a drafted reply, filed as a task for someone to check, plus the work it asks for.',
    run: async ({ demo, page }) => {
      await page.locator('[data-testid="channel-triage.message-0"]').getByText('Reply drafted · 2 tasks').waitFor({
        state: 'visible',
        timeout: 15_000,
      });
      await demo.caption({
        value: "Tim's question: a drafted reply to review, and two tasks",
        subtitle: 'nothing is posted to Discord without a person',
      });
      await page
        .getByText(/Reply to Tim/)
        .first()
        .waitFor({ state: 'visible', timeout: 10_000 });
    },
  },
  {
    name: 'Watch chatter file nothing',
    narration: 'Greetings and chatter file nothing. The project ends with two replies to review and four tasks.',
    run: async ({ demo, page }) => {
      await demo.caption({ value: 'Greetings and chatter file nothing' });
      await page
        .locator(TOTALS)
        .getByText('2 replies drafted · 4 tasks')
        .waitFor({ state: 'visible', timeout: 60_000 });
      await page
        .getByText(/Write a guide to customizing storage/)
        .first()
        .waitFor({ state: 'visible', timeout: 10_000 });
      await demo.caption({ value: '2 replies to review · 4 tasks in the project' });
      await demo.sleep({ ms: 3_000 });
    },
  },
];
