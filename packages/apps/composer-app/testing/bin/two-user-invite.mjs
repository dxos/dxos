//
// Copyright 2026 DXOS.org
//

import { chromium } from '@playwright/test';
// Two identities on one QA server, each in its own headless Chromium profile: Bob invites Alice to a
// space through the real `SpaceOperation.AddMembers`, and the script reports what reached Alice's inbox
// and her notifications store. Pages are driven in-process rather than through the debug port, which
// serves one command at a time and wedges when a caller is interrupted.
//   node packages/apps/composer-app/testing/bin/two-user-invite.mjs [url] [--account] [--headed] [--interactive]
import { existsSync, rmSync } from 'node:fs';

const args = process.argv.slice(2);
// Binds each fresh identity to a hub account first, which a deployed origin requires for the inbox.
const withAccount = args.includes('--account');
// Visible windows side by side, left open at the end with Alice's notifications panel showing.
const headed = args.includes('--headed');
// Pauses before the second invite, which is then driven through Bob's Members UI on cue: Enter in
// this terminal, or the trigger file appearing (so an agent can start it).
const interactive = args.includes('--interactive');
const TRIGGER = 'temp/two-user-start';
// The hub PR previews are built against (`.github/workflows/env/dev`).
const HUB_URL = process.env.DX_HUB_URL ?? 'https://preview.dxos.network/hub/';
const url = args.find((arg) => !arg.startsWith('--')) ?? 'http://127.0.0.1:5182/';
const TIMEOUT = 600_000;
// Console lines worth keeping: the inbox send/receive path and anything that failed.
const RELEVANT = /inbox|invitation|messenger|notification|envelope/i;
// Noise every local page emits; it says nothing about the inbox path.
const NOISE = /ERR_CONNECTION_REFUSED|DX_IPDATA_API_KEY|non-secure context|undocumented API/;

const WINDOW = { width: 960, height: 1000 };
const launch = (index) =>
  chromium.launch({
    headless: !headed,
    executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    args: [
      ...(process.env.PW_CHROMIUM_PATH ? ['--no-sandbox'] : []),
      ...(headed
        ? [`--window-position=${index * WINDOW.width},0`, `--window-size=${WINDOW.width},${WINDOW.height}`]
        : []),
    ],
  });
const browsers = [];

const openUser = async (name, index) => {
  const browser = await launch(index);
  browsers.push(browser);
  const context = await browser.newContext({ viewport: headed ? null : { width: 1400, height: 900 } });
  const page = await context.newPage();
  const logs = [];
  page.on('console', (message) => {
    const text = message.text();
    if (!NOISE.test(text) && (message.type() === 'error' || message.type() === 'warning' || RELEVANT.test(text))) {
      logs.push(`[${name}:${message.type()}] ${text.slice(0, 400)}`);
    }
  });
  page.on('pageerror', (error) => logs.push(`[${name}:pageerror] ${String(error).slice(0, 400)}`));
  // EDGE inbox calls with their status: the send and the pull either side of a lost message.
  page.on('response', async (response) => {
    const { pathname } = new URL(response.url());
    if (pathname.startsWith('/inbox')) {
      const body = response.ok() ? '' : ` ${(await response.text().catch(() => '')).slice(0, 200)}`;
      logs.push(`[${name}:edge] ${response.request().method()} ${pathname} -> ${response.status()}${body}`);
    }
  });
  await page.goto(url);
  // `dxos` lands at the end of `client.initialize()`; `composer` once the plugins mount.
  await page.waitForFunction(() => globalThis.dxos?.client?.halo.identity.get() && globalThis.composer?.invoke, null, {
    timeout: TIMEOUT,
    polling: 1000,
  });
  const identity = await page.evaluate(() => {
    const id = globalThis.dxos.client.halo.identity.get();
    const bytes = id.identityKey.data ?? id.identityKey.asUint8Array();
    return { did: id.did, key: Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('') };
  });
  console.log(`${name}: ${identity.did}`);
  if (withAccount) {
    // Deployed origins only serve the inbox to identities bound to a hub account. This is the request
    // `Account.redeemAccessCode` makes; `test+…@dxos.org` addresses skip the code gate on non-production
    // hubs. Sent from Node so the hub's CORS policy for the app origin does not matter.
    const response = await fetch(new URL('account/invitation-code/redeem', HUB_URL), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: `test+messenger-${name}-${Date.now()}@dxos.org`,
        identityDid: identity.did,
        identityKey: identity.key,
      }),
    });
    console.log(`${name} account (${HUB_URL}): ${response.status} ${(await response.text()).slice(0, 300)}`);
  }
  return { name, page, logs, ...identity };
};

const step = (label) => console.log(`\n== ${label}`);

const [bob, alice] = await Promise.all([openUser('bob', 0), openUser('alice', 1)]);

/** Bob creates a space and admits Alice through the real operation, which also sends the invitation message. */
const invite = (spaceName) =>
  bob.page.evaluate(
    async ({ spaceName, aliceKey }) => {
      const space = await globalThis.dxos.client.spaces.create({ name: spaceName });
      await space.waitUntilReady();
      try {
        const result = await globalThis.composer.invoke('org.dxos.operation.space.addMembers', {
          space,
          identityKeys: [aliceKey],
          role: 2,
        });
        return { spaceKey: space.key.toHex(), result };
      } catch (error) {
        return { spaceKey: space.key.toHex(), error: String(error) };
      }
    },
    { spaceName, aliceKey: alice.key },
  );

const waitForCue = async () => {
  rmSync(TRIGGER, { force: true });
  console.log(`\nReady. Press Enter here, or create ${TRIGGER}, to have Bob invite Alice.`);
  await new Promise((resolve) => {
    const timer = setInterval(() => existsSync(TRIGGER) && done(), 500);
    const done = () => {
      clearInterval(timer);
      process.stdin.pause();
      resolve();
    };
    process.stdin.resume();
    process.stdin.once('data', done);
  });
  rmSync(TRIGGER, { force: true });
};

/** Bob creates the space, opens its Members panel, waits for the cue, then adds Alice through the picker. */
const inviteThroughUi = async (spaceName) => {
  await bob.page.evaluate(async (spaceName) => {
    const space = await globalThis.dxos.client.spaces.create({ name: spaceName });
    await space.waitUntilReady();
    await globalThis.composer.invoke('org.dxos.operation.space.openMembers', { space });
  }, spaceName);
  await bob.page.locator('[data-testid="contact-picker.trigger"]').first().waitFor({ timeout: 60_000 });
  await waitForCue();
  await bob.page.locator('[data-testid="contact-picker.trigger"]').first().click();
  await bob.page.locator('[data-testid="contact-picker.item"]').first().click();
  await bob.page.locator('[data-testid="contactPicker.add"]').first().click();
  console.log('Bob added Alice through the Members panel.');
};

const aliceState = () =>
  alice.page.evaluate(async () => {
    const { client } = globalThis.dxos;
    const hex = (key) =>
      key?.data ? Array.from(key.data, (b) => b.toString(16).padStart(2, '0')).join('') : String(key);
    const notifications = [];
    // A just-joined space throws on `properties`/`db` until it has initialized.
    const name = (space) => {
      try {
        return space.properties.name ?? space.id;
      } catch {
        return `${space.id} (initializing)`;
      }
    };
    for (const space of client.spaces.get()) {
      if (String(space.state.get()) !== '3') {
        continue;
      }
      const result = await space.db.query(globalThis.dxos.Filter.everything()).run();
      const objects = Array.isArray(result) ? result : (result?.objects ?? []);
      for (const object of objects) {
        if (String(globalThis.dxos.Obj.getTypename(object)).includes('notifications')) {
          notifications.push({ space: name(space), readKeys: object.readKeys?.length ?? 0 });
        }
      }
    }
    return {
      contacts: client.halo.contacts.get().map((contact) => ({ name: contact.profile?.displayName, did: contact.did })),
      pending: client.halo.inbox.messages.get().map((message) => ({
        id: message.id,
        type: message.type,
        from: hex(message.senderIdentityKey),
      })),
      spaces: client.spaces.get().map(name),
      notifications,
      // The rail tab's unread count is the user-visible proof that a message was stored.
      badge: document.querySelector('[id$="trigger-messenger"]')?.getAttribute('data-badge') ?? null,
    };
  });

const waitFor = async (label, predicate, timeoutMs = 120_000) => {
  const start = Date.now();
  let state;
  while (Date.now() - start < timeoutMs) {
    state = await aliceState();
    if (predicate(state)) {
      console.log(`${label}: yes after ${Math.round((Date.now() - start) / 1000)}s`);
      return state;
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
  console.log(`${label}: NO within ${timeoutMs / 1000}s`);
  return state;
};

try {
  step('1. Bob invites Alice to "Shared" (they are not contacts yet)');
  const shared = await invite('Shared');
  console.log(JSON.stringify(shared));
  const pendingFromStranger = await waitFor(
    'Alice has a pending message from Bob',
    (state) => state.pending.length > 0,
  );
  console.log(JSON.stringify(pendingFromStranger, null, 2));

  step('2. Alice joins "Shared" by key, which makes Bob a contact');
  console.log(
    JSON.stringify(
      await alice.page.evaluate(async (spaceKey) => {
        try {
          return {
            result: await globalThis.composer.invoke('org.dxos.operation.appToolkit.joinBySpaceKey', { spaceKey }),
          };
        } catch (error) {
          return { error: String(error) };
        }
      }, shared.spaceKey),
    ),
  );
  await waitFor("Bob is in Alice's contacts", (state) => state.contacts.length > 0);
  console.log(
    JSON.stringify(
      await waitFor(
        'The parked invitation is stored (pending cleared, badge 1)',
        (state) => state.pending.length === 0 && state.badge === '1',
      ),
      null,
      2,
    ),
  );

  step('3. Bob invites Alice to "Design team" (now a contact)');
  if (interactive) {
    await inviteThroughUi('Design team');
  } else {
    console.log(JSON.stringify(await invite('Design team')));
  }
  const delivered = await waitFor("Alice's envelope tab shows 2 unread", (state) => state.badge === '2');
  console.log(JSON.stringify(delivered, null, 2));
} finally {
  step('Console (inbox-related, warnings and errors)');
  for (const line of [...bob.logs, ...alice.logs]) {
    console.log(line);
  }
  if (headed) {
    await alice.page.click('[id$="trigger-messenger"]').catch(() => {});
    console.log('\nWindows left open; press Ctrl-C to close them.');
    await new Promise(() => {});
  }
  await Promise.all(browsers.map((browser) => browser.close()));
}
