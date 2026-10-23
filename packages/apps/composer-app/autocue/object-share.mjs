//
// Copyright 2026 DXOS.org
//

/**
 * Alice shares one document of a ten-document space; Bob opens the link in a fresh browser and lands on it, having
 * replicated only that document and the one it links to. Recorded side by side.
 *
 * @mdl packages/plugins/plugin-space/PLUGIN.mdl test QA-3
 * @app composer-app `bundle-e2e` output, served by `vite preview` on 127.0.0.1:4173 (EDGE signaling)
 *
 * A flow for `pair.mjs`. Bob must not boot the app before he opens the link, so pass `--boot-peers Alice`:
 *
 *   VITE_DX_DISABLE_ANIMATIONS=true moon run composer-app:bundle-e2e
 *   pnpm exec vite preview --configLoader native --host 127.0.0.1 --port 4173 --strictPort
 *   node .agents/skills/autocue/scripts/pair.mjs --boot-peers Alice \
 *     --flow packages/apps/composer-app/autocue/object-share.mjs --out /tmp/share
 *
 * Keep the file free of imports, since it is loaded from outside the workspace.
 */

const SPACE = 'Product Launch';
const SHARED = 'Launch plan';
const LINKED = 'Launch checklist';
const SHARED_TEXT = 'We ship on Friday.';
const OTHERS = [
  'Pricing notes',
  'Press release draft',
  'Customer interviews',
  'Competitor teardown',
  'Support playbook',
  'Hiring plan',
  'Q4 budget',
  'Retro: beta',
];
const TIMEOUT = 60_000;
const JOIN_TIMEOUT = 180_000;

/** A start page standing in for the browser's own: an address field where the link is pasted. */
const START_PAGE = `<!doctype html>
<html><head><meta charset="utf-8"><title>New tab</title>
<style>
  body { margin: 0; height: 100vh; display: grid; place-items: center; background: #1b1d21; color: #e8e8e8;
    font-family: system-ui, sans-serif; }
  form { width: 80%; display: grid; gap: 16px; text-align: center; }
  h1 { font-weight: 400; font-size: 28px; margin: 0; }
  input { padding: 14px 20px; border-radius: 999px; border: 1px solid #444; background: #26292e; color: inherit;
    font-size: 15px; outline: none; }
  input:focus { border-color: #6aa1ff; }
</style></head>
<body><form id="go"><h1>New tab</h1><input id="address" placeholder="Paste a link" autocomplete="off"></form>
<script>
  document.getElementById('go').addEventListener('submit', (event) => {
    event.preventDefault();
    location.href = document.getElementById('address').value;
  });
</script></body></html>`;

/** The workspace segment of a pair-chain URL (`/w/<workspace>/…`). */
const workspaceOf = (page) => {
  const [anchor, workspace] = new URL(page.url()).pathname.split('/').filter(Boolean);
  return anchor === 'w' ? workspace : undefined;
};

const waitFor = async (predicate, { timeout = TIMEOUT, what }) => {
  const deadline = Date.now() + timeout;
  while (!(await predicate())) {
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for ${what}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
};

const currentWorkspace = (page) => page.getByTestId('navtree.workspace.visible');

/** Expands a navtree row unless it is already open; a row with no children yet keeps its caret disabled. */
const expandRow = async (peer, row) => {
  const toggle = row.locator('[data-part="branch-trigger"]').first();
  await toggle.waitFor({ state: 'attached', timeout: TIMEOUT });
  if ((await toggle.getAttribute('data-state')) === 'open') {
    return;
  }
  await row.hover();
  await waitFor(() => toggle.isEnabled(), { what: 'the row to become expandable' });
  await peer.click(toggle);
};

const textbox = (page) =>
  page.getByTestId('deck.plank').first().getByTestId('composer.markdownRoot').getByRole('textbox');

/** First-run chrome that would cover the content: the privacy notice and any open companion. */
const clearChrome = async ({ page }) => {
  const notice = page.getByTestId('org.dxos.plugin.observability.notice');
  if (await notice.isVisible().catch(() => false)) {
    await notice.getByTestId('toast.close').click();
  }
  const closeCompanion = page.getByTestId('plankHeading.closeCompanion').filter({ visible: true });
  for (let attempt = 0; attempt < 10 && (await closeCompanion.count()) > 0; attempt++) {
    await closeCompanion
      .first()
      .click({ timeout: 2_000 })
      .catch(() => {});
  }
  const sidebar = page.locator('[data-scope="main"][data-part="complementary-sidebar"]');
  if ((await sidebar.getAttribute('data-state').catch(() => null)) === 'expanded') {
    await sidebar.getByTestId('deck.toggleComplementarySidebar').click();
  }
};

let shareLink;

export const steps = [
  {
    name: `Alice creates "${SPACE}" with ten documents`,
    setup: true,
    run: async ({ peers: { alice, bob } }) => {
      const { page } = alice;
      await page.waitForTimeout(3_000);
      await clearChrome(alice);
      await alice.context.grantPermissions(['clipboard-read', 'clipboard-write'], {
        origin: new URL(page.url()).origin,
      });
      await bob.page.setContent(START_PAGE);

      await alice.click(page.getByTestId('spacePlugin.addSpace'));
      await alice.click(page.getByTestId('spacePlugin.createSpace'));
      const save = page.getByTestId('create-space-dialog').getByTestId('save-button');
      await waitFor(() => save.isEnabled(), { what: 'the create-space form' });
      await page.getByTestId('create-space-form').getByTestId('name').fill(SPACE);
      await save.click();
      await page.getByTestId('create-space-form').waitFor({ state: 'detached', timeout: TIMEOUT });
      await waitFor(() => workspaceOf(page) !== undefined, { what: 'the new space to open' });
      const spaceId = workspaceOf(page);

      // Off camera through the debug port: ten documents, the shared one linking the next.
      await page.evaluate(
        async ({ spaceId, shared, linked, sharedText, others }) => {
          const create = (name, content) =>
            globalThis.composer.invoke('org.dxos.operation.markdown.create', { name, content }, { spaceId });
          const idOf = (result) => String(result.id).split(/[/:]/).pop();
          const checklist = await create(linked, `# ${linked}\n\n- Final QA pass\n- Publish the announcement\n`);
          await create(
            shared,
            `# ${shared}\n\n${sharedText} Before then, work through the [${linked}](echo:///${idOf(checklist)}).\n`,
          );
          for (const name of others) {
            await create(name, `# ${name}\n\nNotes for the team only.\n`);
          }
        },
        { spaceId, shared: SHARED, linked: LINKED, sharedText: SHARED_TEXT, others: OTHERS },
      );
      await expandRow(alice, currentWorkspace(page).getByTestId('spacePlugin.collectionsSection').first());
      await waitFor(async () => (await currentWorkspace(page).getByTestId('spacePlugin.object').count()) >= 10, {
        what: 'ten documents in the navtree',
      });
    },
  },
  {
    name: `Alice opens "${SHARED}", one of ten documents; it links to "${LINKED}"`,
    subtitle: 'QA-3 given',
    run: async ({ peers: { alice } }) => {
      const { page } = alice;
      await alice.click(currentWorkspace(page).getByTestId('spacePlugin.object').filter({ hasText: SHARED }).first());
      await waitFor(
        async () =>
          (
            await textbox(page)
              .innerText()
              .catch(() => '')
          ).includes(SHARED_TEXT),
        {
          what: 'the shared document to open',
        },
      );
    },
  },
  {
    name: 'Alice clicks Share',
    subtitle: 'QA-3 step 1: Open the share dialog',
    run: async ({ peers: { alice } }) => {
      const { page } = alice;
      await alice.click(page.getByTestId('spacePlugin.shareButton').first());
      await page.getByTestId('share-object-dialog').waitFor({ timeout: TIMEOUT });
      await page.getByTestId('share-object-dialog.scope').waitFor({ timeout: TIMEOUT });
    },
  },
  {
    name: 'Copy link: a delegated invitation, the scope and the plugins, in one URL',
    subtitle: 'QA-3 step 2: Copy the link',
    run: async ({ peers: { alice } }) => {
      const { page } = alice;
      await alice.click(page.getByTestId('share-object-dialog.copy-link'));
      const field = page.getByTestId('share-object-dialog.link').locator('input');
      await field.waitFor({ timeout: TIMEOUT });
      shareLink = await field.inputValue();
      if (!shareLink.includes('share=')) {
        throw new Error(`the link carries no share payload: ${shareLink}`);
      }
    },
  },
  {
    name: 'Bob, in a fresh browser with no identity, pastes the link',
    subtitle: 'QA-3 step 3: Open the link on the guest',
    run: async ({ peers: { alice, bob } }) => {
      await alice.click(alice.page.getByTestId('share-object-dialog.done'));
      const address = bob.page.locator('#address');
      await bob.click(address);
      await address.fill(shareLink);
      await bob.page.waitForTimeout(800);
      await bob.page.keyboard.press('Enter');
      await bob.page.waitForURL((url) => url.origin !== 'null' && url.protocol.startsWith('http'), {
        timeout: TIMEOUT,
      });
    },
  },
  {
    name: `Bob gets an identity, joins in the background, and sees "${SHARED}"`,
    subtitle: 'QA-3 step 3: only the shared documents replicate',
    run: async ({ peers: { bob } }) => {
      await waitFor(
        async () =>
          (
            await textbox(bob.page)
              .innerText()
              .catch(() => '')
          ).includes(SHARED_TEXT),
        {
          timeout: JOIN_TIMEOUT,
          what: "the shared document on Bob's side",
        },
      );
      await clearChrome(bob);
    },
  },
];
