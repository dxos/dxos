//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { z } from 'zod';

import {
  type Peer,
  createObject,
  createPeer,
  createSpace,
  editorContent,
  expandCollections,
  focusEditor,
  typeInEditor,
  waitForAppReady,
  waitForAuthCodeInput,
} from './composer';

/**
 * Host invites the guest into its current space and the guest completes the flow.
 */
const performInvitation = async (host: Peer, guest: Peer): Promise<void> => {
  // The invitation flow navigates the host to the Members panel; remember the open
  // document's URL to return to it afterwards.
  const hostDocumentUrl = host.page.url();

  // The guest is brought to the join dialog before the host creates the invitation:
  // plain-language steps take tens of seconds each and invitations expire on that
  // timescale.
  await guest.act('Click the "App menu" button at the top of the left sidebar');
  await guest.act('Click the "Join space" option in the open menu');

  const members = await host.extract(
    'Is a "Members" item visible in the space sidebar tree (under a Settings section)?',
    z.object({ visible: z.boolean() }),
  );
  if (!members.visible) {
    await host.act('Click the disclosure arrow at the left edge of the "Settings" row in the space sidebar tree');
  }
  await host.act('Click the "Members" item in the space sidebar tree');
  await host.act(
    'Click the "Change the active invite option" more-options button next to the invite button in the members panel',
  );
  await host.act('Click the "Create single-use invitation" option in the menu that opened');
  await host.act('Click the "Create single-use invitation" button in the members panel');
  const invitationCode = await host.invitationCode();
  const authCode = await host.authCode();

  await guest.act('Type %code% into the invitation code input', { variables: { code: invitationCode } });
  await guest.act('Click the continue button next to the invitation code input');
  await waitForAuthCodeInput(guest.page);
  await guest.act('Type %code% into the verification code input', { variables: { code: authCode } });
  // Entering the full code can auto-submit and dismiss the dialog at any moment; click
  // the verify button only if it is still mounted, tolerating it disappearing mid-click
  // (the subsequent replication wait verifies the join either way).
  const nextStillMounted = await guest.page.evaluate(
    () =>
      document.querySelector(
        '[data-testid="space-invitation-authenticator-next"], [data-testid="halo-invitation-authenticator-next"]',
      ) !== null,
  );
  if (nextStillMounted) {
    await guest.act('Click the next/verify button next to the verification code input').catch(() => {});
  }

  // Return the host to the shared document.
  await host.page.goto(hostDocumentUrl);
  await waitForAppReady(host.page);
};

/**
 * Open the replicated document on the guest: joined content lands under the collapsed
 * Collections section and arrives asynchronously — wait on the deterministic (DOM)
 * tree-row probe, then open it with a plain-language click.
 */
const openSharedDocument = async (guest: Peer): Promise<void> => {
  await guest.page.waitForTimeout(3_000);
  await expandCollections(guest);
  await expect
    .poll(
      () => guest.page.evaluate(() => document.querySelectorAll('[data-testid="spacePlugin.object"]').length),
      { timeout: 90_000, interval: 2_000 },
    )
    .toBeGreaterThan(0);
  await guest.act('Click the document item under the "Collections" section in the space sidebar tree to open it');
};

// Multi-peer tests run a full invitation flow plus replication waits (115–130s
// measured at 2 workers), past the single-peer default budget.
describe('Collaboration tests', { timeout: 480_000 }, () => {
  let host: Peer;
  let guest: Peer;

  beforeEach(async () => {
    [host, guest] = await Promise.all([createPeer(), createPeer()]);
  });

  afterEach(async () => {
    await Promise.all([host.close(), guest.close()]);
  });

  test("guest joins host's space", async () => {
    await createSpace(host);
    await createObject(host, 'Document');
    await typeInEditor(host, 'Hello from the host');

    await performInvitation(host, guest);
    await openSharedDocument(guest);

    // Content replication is genuinely asynchronous — wait on the deterministic editor
    // state (CodeMirror doc via the test hook) rather than polling an extraction.
    await expect
      .poll(() => editorContent(guest), { timeout: 60_000, interval: 2_000 })
      .toContain('Hello from the host');
  });

  test("host and guest can see each others' cursors when same document is in focus", async () => {
    await createSpace(host);
    await createObject(host, 'Document');
    await typeInEditor(host, 'cursor test');

    await performInvitation(host, guest);
    await openSharedDocument(guest);

    // Both focus the same document; each should see the other's named collaborator caret.
    await focusEditor(host);
    await focusEditor(guest);

    // The collaborator caret is a small inline decoration whose label bleeds into (or
    // drops out of) extracted text unpredictably — check the decoration itself. A bare
    // focus does not re-broadcast awareness when the selection is unchanged, so each
    // poll nudges the observed peer's caret to trigger a fresh selection update.
    const collaboratorCursorVisible = (peer: Peer) =>
      peer.page.evaluate(() => document.querySelector('.cm-collab-selectionInfo') !== null);
    await expect
      .poll(
        async () => {
          await focusEditor(guest);
          await guest.page.keyPress('Home');
          await guest.page.keyPress('End');
          return collaboratorCursorVisible(host);
        },
        { timeout: 60_000, interval: 2_000 },
      )
      .toBe(true);
    await expect
      .poll(
        async () => {
          await focusEditor(host);
          await host.page.keyPress('Home');
          await host.page.keyPress('End');
          return collaboratorCursorVisible(guest);
        },
        { timeout: 60_000, interval: 2_000 },
      )
      .toBe(true);
  });

  test("host and guest can see each others' changes in same document", async () => {
    await createSpace(host);
    await createObject(host, 'Document');

    await performInvitation(host, guest);
    await openSharedDocument(guest);

    // Replication between peers is genuinely asynchronous — wait on the deterministic
    // editor state (CodeMirror doc via the test hook) rather than polling extractions.

    // Host types the first part.
    await typeInEditor(host, 'one');
    await expect.poll(() => editorContent(guest), { timeout: 60_000, interval: 2_000 }).toContain('one');

    // Guest appends the second part.
    await focusEditor(guest);
    await guest.page.keyPress('End');
    await guest.page.type(' two');
    await expect.poll(() => editorContent(host), { timeout: 60_000, interval: 2_000 }).toContain('two');

    // Host appends the third part.
    await focusEditor(host);
    await host.page.keyPress('End');
    await host.page.type(' three');
    await expect.poll(() => editorContent(guest), { timeout: 60_000, interval: 2_000 }).toContain('three');

    // Verify final content is the same on both sides.
    expect(await editorContent(host)).toBe(await editorContent(guest));
  });

  // TODO(wittjosiah): Fix.
  test.skip('peers can see each others presence', async () => {
    // Presence indicators in the plank heading are currently too flaky to assert on.
  });
});
