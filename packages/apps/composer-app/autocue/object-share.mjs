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
 * Against an EDGE that does not serve the `shared-objects` route yet, add `SHARE_CACHE_FROM_INVITER=1`: Bob's read is
 * then answered from Alice's client (`serveShareCache`).
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
const PROBE_TIMEOUT = 500;

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
let openedAt;

/** The stages of opening the link that the stopwatch shows, in the order they happen. */
const STAGES = [
  ['client', 'Composer started'],
  ['listed', 'Space opened from EDGE'],
  ['rendered', 'Document on screen'],
  ['identity', 'Identity created'],
  ['joined', 'Joined the space'],
];

/**
 * Runs in Bob's page from its first script: records each stage of opening the link the moment it holds, as a
 * `share-stage:` performance mark and on `globalThis.shareOpenTiming`, and draws a stopwatch listing them in a
 * corner. Timed from inside the page because a probe from outside waits out the boot, which would put every stage
 * reached during it at the boot's end.
 */
const STOPWATCH = ({ text, spaceId, stages }) => {
  if (!location.pathname.startsWith('/w/')) {
    return;
  }
  const reached = {};
  globalThis.shareOpenTiming = { timeOrigin: performance.timeOrigin, reached };
  const panel = document.createElement('div');
  panel.style.cssText =
    'position:fixed;left:50%;transform:translateX(-50%);bottom:32px;z-index:2147483647;pointer-events:none;padding:12px 16px;' +
    'border-radius:10px;background:rgba(10,12,16,0.82);color:#f2f2f2;font:14px/1.6 ui-monospace,Menlo,monospace;' +
    'min-width:260px;box-shadow:0 4px 24px rgba(0,0,0,0.4)';
  const seconds = (ms) => `${(ms / 1000).toFixed(1)} s`;
  const row = (label, value, strong) => {
    const line = document.createElement('div');
    line.style.cssText = `display:flex;justify-content:space-between;gap:24px;${strong ? 'font-size:20px;font-weight:600' : ''}`;
    const name = document.createElement('span');
    name.textContent = label;
    const time = document.createElement('span');
    time.textContent = value;
    line.append(name, time);
    return line;
  };
  const render = () => {
    const elapsed = reached.rendered ?? performance.now();
    panel.replaceChildren(
      row('⏱ since the link opened', seconds(elapsed), true),
      ...stages.map(([key, label]) => row(label, reached[key] === undefined ? '…' : seconds(reached[key]))),
    );
  };
  const mark = (key, holds) => {
    if (reached[key] === undefined && holds) {
      reached[key] = performance.now();
      performance.mark(`share-stage:${key}`);
    }
  };
  const checkRendered = () => {
    const roots = [...document.querySelectorAll('[data-testid="composer.markdownRoot"]')];
    mark(
      'rendered',
      roots.some((root) => root.textContent.includes(text)),
    );
  };
  const tick = () => {
    const client = globalThis.dxos?.client;
    let space;
    try {
      space = client?.spaces.get().find((candidate) => candidate.id === spaceId);
    } catch {}
    mark('client', !!client?.initialized);
    mark('identity', !!client?.halo.identity.get());
    mark('listed', !!space);
    // `SpaceState.SPACE_READY`, reported by the client's own services once the join lands.
    mark('joined', !!space && !space.internal.provisional && space.state.get() === 3);
    checkRendered();
    // The script runs before the document has a body, and boot may replace what the body holds.
    if (!panel.isConnected && document.body) {
      document.body.append(panel);
    }
    render();
    if (reached.rendered !== undefined && reached.joined !== undefined) {
      clearInterval(interval);
      observer.disconnect();
    }
  };
  const interval = setInterval(tick, 100);
  // Only marks: a redraw here would itself be a mutation the observer sees, and loop.
  const observer = new MutationObserver(checkRendered);
  observer.observe(document, { subtree: true, childList: true, characterData: true });
};

/** Bob's stage times in ms from pressing Enter, once the shared document is on screen and the join has landed. */
const timeOpening = async (page) => {
  const deadline = Date.now() + JOIN_TIMEOUT;
  for (;;) {
    // Bounded: an evaluate issued while the page boots is held until it finishes.
    const timing = await Promise.race([
      page.evaluate(() => globalThis.shareOpenTiming).catch(() => undefined),
      new Promise((resolve) => setTimeout(() => resolve(undefined), PROBE_TIMEOUT)),
    ]);
    if (timing?.reached.rendered !== undefined && timing?.reached.joined !== undefined) {
      return Object.fromEntries(
        Object.entries(timing.reached).map(([key, at]) => [key, Math.round(timing.timeOrigin + at - openedAt)]),
      );
    }
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for the shared document on Bob's side: ${JSON.stringify(timing)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
};

/** The share link's payload, as `encodeSharePayload` in plugin-space wrote it. */
const decodeSharePayload = async (link) => {
  const encoded = new URL(link).searchParams.get('share').replaceAll('-', '+').replaceAll('_', '/');
  const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return JSON.parse(await new Response(stream).text());
};

/**
 * Answers Bob's read of the shared space as EDGE's `shared-objects` route would, for an EDGE that does not serve it
 * yet: from Alice's client, which holds the same documents EDGE would read from its replicator — the space root and the
 * documents of the link's scope. It checks neither the signature nor the scope, which EDGE's own tests cover.
 */
const serveShareCache = async (alice, bob, link) => {
  const { spaceId, objects } = await decodeSharePayload(link);
  const cache = await alice.page.evaluate(
    ({ spaceId, objects }) => {
      const space = globalThis.dxos.client.spaces.get(spaceId);
      const [root, ...rows] = space.internal.db.exportWorkingSet({ maxBytes: 64 * 1024 * 1024 });
      const base64 = (bytes) => btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''));
      return {
        spaceRootUrl: `automerge:${root.documentId}`,
        rows: [root, ...rows.filter(({ objectId }) => objectId && objects.includes(objectId))].map(
          ({ documentId, heads, bytes }) => ({ documentId, heads, data: base64(bytes) }),
        ),
      };
    },
    { spaceId, objects },
  );
  await bob.context.route('**/db/spaces/*/shared-objects', (route) =>
    route.fulfill({ headers: { 'access-control-allow-origin': '*' }, json: { success: true, data: cache } }),
  );
};

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

      const previousWorkspace = workspaceOf(page);
      await alice.click(page.getByTestId('spacePlugin.addSpace'));
      await alice.click(page.getByTestId('spacePlugin.createSpace'));
      const save = page.getByTestId('create-space-dialog').getByTestId('save-button');
      await waitFor(() => save.isEnabled(), { what: 'the create-space form' });
      await page.getByTestId('create-space-form').getByTestId('name').fill(SPACE);
      await save.click();
      await page.getByTestId('create-space-form').waitFor({ state: 'detached', timeout: TIMEOUT });
      // The old workspace stays in the URL for a moment after the dialog closes.
      await waitFor(() => ![undefined, previousWorkspace].includes(workspaceOf(page)), {
        what: 'the new space to open',
      });
      const spaceId = workspaceOf(page);
      await page.waitForTimeout(2_000);
      await clearChrome(alice);

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
      if (process.env.SHARE_CACHE_FROM_INVITER) {
        await serveShareCache(alice, bob, shareLink);
      }
      await bob.context.addInitScript(STOPWATCH, {
        text: SHARED_TEXT,
        spaceId: new URL(shareLink).pathname.split('/')[2],
        stages: STAGES,
      });
      const address = bob.page.locator('#address');
      await bob.click(address);
      await address.fill(shareLink);
      await bob.page.waitForTimeout(800);
      openedAt = Date.now();
      await bob.page.keyboard.press('Enter');
    },
  },
  {
    name: `Bob gets an identity, joins in the background, and sees "${SHARED}"`,
    subtitle: 'QA-3 step 3: only the shared documents replicate',
    caption: false,
    run: async ({ peers: { bob }, caption }) => {
      caption(`Bob gets an identity, joins in the background, and sees "${SHARED}"`, 'QA-3 step 3');
      const timing = await timeOpening(bob.page);
      // Read by whoever runs the flow.
      console.log(JSON.stringify({ objectShareTiming: timing }));
      await clearChrome(bob);
      // Off the companion toggle `clearChrome` clicked, whose tooltip would otherwise stay over the plank.
      await bob.page.mouse.move(600, 400);
      const seconds = (ms) => `${(ms / 1000).toFixed(1)} s`;
      caption(
        `Shared document on screen ${seconds(timing.rendered)} after pasting the link`,
        STAGES.filter(([key]) => key !== 'rendered')
          .map(([key, label]) => `${label} ${seconds(timing[key])}`)
          .join(' · ') + ` · the other ${OTHERS.length} documents never sync to Bob`,
      );
      await bob.page.waitForTimeout(8_000);
    },
  },
];
