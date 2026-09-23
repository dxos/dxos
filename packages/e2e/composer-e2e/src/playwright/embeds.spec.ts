//
// Copyright 2026 DXOS.org
//

import { expect, test } from '@playwright/test';

import { log } from '@dxos/log';

import { AppManager, objectIdsFromPath } from './app-manager.ts';
import { Markdown } from './plugins/index.ts';

if (process.env.DX_PWA !== 'false') {
  log.error('PWA must be disabled to run e2e tests. Set DX_PWA=false before running again.');
  process.exit(1);
}

/** The canvas schema plugin-tldraw registers its renderer under; the variant picker sends this id. */
const TLDRAW_VARIANT = 'tldraw.com/2';

/**
 * 3x the observed worst case, against a 10s default. An embed renders nothing until the object's
 * Section surface is registered, and the renderer arrives as a lazily-imported chunk — ~10s on a
 * cell running three app instances.
 */
const SURFACE_TIMEOUT = 30_000;

/**
 * The automated arm of `app:QA-10`'s `into` and `back` steps. It covers a subset: that the embed's
 * open control reaches the drawing by its database route with the document still open behind it, and
 * that the crumb comes back to a document whose embed is still mounted. What it does not check, and
 * a human run of QA-10 still does: that the canvas renders rather than merely resolving, the crumb
 * trail's labels, comment threads surviving the round trip, reload survival, and typing the URI a
 * character at a time — this writes it in one insertion, so the prefix crash QA-10's `embed` step
 * exists to catch is covered by `parseObjectUri`'s unit test instead.
 */
test.describe('Embed tests', () => {
  let host: AppManager;

  test.beforeEach(async ({ browser }) => {
    // Set here rather than with `test.slow()` in the body, which runs too late to cover this hook:
    // boot alone is ~50s on webkit, and the test then creates two objects and mounts a renderer that
    // arrives as its own chunk.
    test.setTimeout(180_000);

    host = new AppManager(browser, false);
    await host.init();
  });

  test.afterEach(async () => {
    await host.close();
  });

  test('navigate into an embedded object and back', { tag: ['@QA-10'] }, async () => {
    await host.createSpace();

    // Read from the plank rather than the navtree row, whose only handle on an unnamed drawing is a
    // placeholder name.
    await host.createObject({ type: 'Drawing', variant: TLDRAW_VARIANT });
    // Latched from the poll rather than re-read after it, so the value asserted is the value used.
    // The dialog closes before the deck switches, and a collection item's path is what says the plank
    // is no longer the space's Home — unlike the canvas, it does not wait on the renderer's chunk.
    let drawingPath = '';
    await expect
      .poll(async () => (drawingPath = (await host.deck.plank().qualifiedId()) ?? ''))
      .toContain('/content/collections/');
    const drawing = objectIdsFromPath(drawingPath);
    if (!drawing) {
      throw new Error(`the plank the create dialog opened names no object: ${drawingPath}`);
    }

    await host.createObject({ type: 'Document' });
    await expect(host.getObjectLinks()).toHaveCount(2);
    // Collection order is insertion order, so the document is the row added last.
    const documentRow = host.getObjectLinks().last();
    let documentPath = '';
    await expect
      .poll(async () => (documentPath = (await documentRow.getAttribute('data-object-id')) ?? ''))
      .not.toBe('');
    await documentRow.click();
    await expect.poll(() => host.deck.plank().qualifiedId()).toBe(documentPath);

    // One insertion rather than a typed URI: every prefix of an `echo:` URI is claimed by the embed
    // widget as it is typed, which is a flow of its own.
    const documentPlank = host.deck.plank();
    const editor = Markdown.getMarkdownTextboxWithLocator(documentPlank.locator);
    // Editable is the signal the document's content ref has resolved; a write before that is
    // discarded by the collaborative binding's reconcile rather than rejected.
    await expect(editor).toBeEditable();
    await editor.fill(Markdown.embedLink('Diagram', drawing));
    await expect(Markdown.getEmbed(documentPlank.locator)).toBeVisible({ timeout: SURFACE_TIMEOUT });

    await Markdown.openEmbed(documentPlank.locator);

    // One polled value rather than a chain: the regression this guards against is the embed opening
    // the drawing with the `solo` disposition, which looks identical except that the document has
    // left the deck — and a chain of assertions would report only where it stopped.
    await expect
      .poll(async () => {
        const current = host.deck.plank();
        const id = await current.qualifiedId();
        if (!id) {
          return 'no plank';
        }
        // The DATABASE route, not merely the same object: the embed opens what
        // `GraphPath.getObjectPathFromObject` answers, which is not the collections path the navtree
        // uses, and reaching the drawing by any other route is the regression this pins.
        if (!id.includes('/system/database/') || objectIdsFromPath(id)?.objectId !== drawing.objectId) {
          return `plank is ${id}`;
        }
        return (await current.breadcrumbs().count()) > 0
          ? 'the drawing, with a way back'
          : 'the drawing, with the document gone from the deck';
      })
      .toBe('the drawing, with a way back');

    const backToDocument = host.deck.plank().breadcrumb(documentPath);
    await expect(backToDocument).toBeVisible();
    await backToDocument.click();

    await expect.poll(() => host.deck.plank().qualifiedId()).toBe(documentPath);
    await expect(host.deck.plank().breadcrumbs()).toHaveCount(0);
    // The same allowance as above: flat mode unmounts the document while the drawing is current, so
    // coming back re-resolves the content ref and re-renders the surface from scratch.
    await expect(Markdown.getEmbed(host.deck.plank().locator)).toBeVisible({ timeout: SURFACE_TIMEOUT });
  });
});
