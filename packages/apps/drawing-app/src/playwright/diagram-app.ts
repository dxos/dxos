//
// Copyright 2026 DXOS.org
//

import { type Browser, type Locator, type Page } from '@playwright/test';

import { setupPage } from '@dxos/test-utils/playwright';

export const PORT = 9008;

// 127.0.0.1, not localhost: localhost resolves to ::1 first, and Firefox fails ICE on a page served over IPv6 loopback.
export const ORIGIN = `http://127.0.0.1:${PORT}`;

/** The invitation query parameter Composer reads and writes (spec F-5.2). */
export const INVITATION_PARAM = 'spaceInvitationCode';

export type Point = { x: number; y: number };

/** Where the first shape sits in the view: its centre's offset from the view's centre, and its width. */
export type ShapeInView = { dx: number; dy: number; width: number };

/** One person's browser profile driving the diagram app. */
export class DiagramApp {
  page!: Page;
  private _close?: () => Promise<void>;

  constructor(private readonly _browser: Browser) {}

  /** Opens `url` in a fresh profile and waits for the canvas or the join dialog. */
  async open(url: string = ORIGIN): Promise<void> {
    const { page, close } = await setupPage(this._browser);
    this.page = page;
    this._close = close;
    // The copy button writes the invitation link to the clipboard, which not every browser lets a test read back.
    await page.addInitScript(() => {
      Object.defineProperty(navigator.clipboard, 'writeText', {
        configurable: true,
        value: async (text: string) => {
          (window as any).__copied = text;
        },
      });
    });
    await page.goto(url);
    await this.toolbar().or(this.joinDialog()).waitFor();
  }

  async close(): Promise<void> {
    await this._close?.();
  }

  path(): string {
    return new URL(this.page.url()).pathname;
  }

  // Locators.

  /** The live app; the boot shell draws the same editor, test ids included, until the app replaces it. */
  app(): Locator {
    return this.page.getByTestId('diagram-app');
  }

  toolbar(): Locator {
    return this.app().getByTestId('canvas-toolbar');
  }

  joinDialog(): Locator {
    return this.page.getByTestId('join-dialog');
  }

  pill(): Locator {
    return this.page.getByTestId('diagram-app.pill');
  }

  /** The Views panel's shape rows; the layout row is there before anything is drawn. */
  shapes(): Locator {
    return this.app().locator('[data-testid^="views-row-"]:not([data-testid="views-row-layout"])');
  }

  /** The nodes the canvas draws. */
  nodes(): Locator {
    return this.app().getByTestId('scene-view').locator('[data-node-id]');
  }

  /** The avatars on the pill, not the rows of the presence list. */
  presence(): Locator {
    return this.page.getByTestId('spacePlugin.presence').getByTestId('spacePlugin.presence.member');
  }

  /** Starts recording every route the app writes from here on, read back by `recordedRoutes`. */
  async recordRoutes(): Promise<void> {
    await this.page.evaluate(() => {
      const routes: string[] = [];
      (window as any).__routes = routes;
      for (const method of ['pushState', 'replaceState'] as const) {
        const write = history[method].bind(history);
        history[method] = (...args: Parameters<History['pushState']>) => {
          write(...args);
          routes.push(location.pathname);
        };
      }
    });
  }

  recordedRoutes(): Promise<string[]> {
    return this.page.evaluate(() => (window as any).__routes as string[]);
  }

  /** The follow's hue on the pill, or null while the session is in no follow. */
  accent(): Promise<string | null> {
    return this.pill().getAttribute('data-accent');
  }

  async shapeInView(): Promise<ShapeInView | undefined> {
    const view = await this.app().getByTestId('scene-view').boundingBox();
    const shape = await this.app().getByTestId('scene-view').locator('[data-node-id]').first().boundingBox();
    if (!view || !shape) {
      return undefined;
    }
    return {
      dx: shape.x + shape.width / 2 - (view.x + view.width / 2),
      dy: shape.y + shape.height / 2 - (view.y + view.height / 2),
      width: shape.width,
    };
  }

  remoteCursors(): Locator {
    return this.app().getByTestId('remote-cursor');
  }

  spaceEntries(): Locator {
    return this.page
      .getByTestId('diagram-app.space-list')
      .locator('[data-testid^="diagram-app.space."]:not([data-testid$=".actions"])');
  }

  diagramEntries(): Locator {
    return this.page
      .getByTestId('diagram-app.diagram-list')
      .locator('[data-testid^="diagram-app.diagram."]:not([data-testid$=".actions"])');
  }

  // Actions.

  /** Drags out a shape with a toolbar tool, e.g. `node:rect`. */
  async draw(tool: string, from: Point, to: Point): Promise<void> {
    await this.app().getByTestId(`canvas.tool.${tool}`).click();
    await this.page.mouse.move(from.x, from.y);
    await this.page.mouse.down();
    await this.page.mouse.move(to.x, to.y, { steps: 8 });
    await this.page.mouse.up();
    await this.app().getByTestId('canvas.tool.select').click();
  }

  /** Opens Share, creates a multi-use invitation, and returns the link its copy button copies. */
  async share(): Promise<{ dialog: Locator; link: string }> {
    await this.page.getByTestId('diagram-app.share').click();
    const dialog = this.page.getByTestId('diagram-app.share-dialog');
    await dialog.getByTestId('membersContainer.createInvitation').click();
    await dialog.getByTestId('copy-invitation').click();
    const link = await this.page.evaluate(() => (window as any).__copied as string | undefined);
    if (!link) {
      throw new Error('the copy button wrote no link');
    }
    return { dialog, link };
  }

  async closeDialog(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  async openSpaceMenu(): Promise<void> {
    await this.page.getByTestId('diagram-app.space-menu').click();
    await this.page.getByTestId('diagram-app.space-list.find').waitFor();
  }

  async openDiagramMenu(): Promise<void> {
    await this.page.getByTestId('diagram-app.diagram-menu').click();
    await this.page.getByTestId('diagram-app.diagram-list.find').waitFor();
  }

  async closeMenu(): Promise<void> {
    await this.page.keyboard.press('Escape');
  }

  /** Types a name in the diagram menu and chooses New diagram with it. */
  async createDiagram(name: string): Promise<void> {
    await this.openDiagramMenu();
    await this.page.getByTestId('diagram-app.diagram-list.find').fill(name);
    await this.page.getByTestId('diagram-app.new-diagram').click();
  }

  /** Opens the diagram menu and chooses the diagram named `name`. */
  async openDiagram(name: string): Promise<void> {
    await this.openDiagramMenu();
    await this.diagramEntries().filter({ hasText: name }).click();
  }

  /** Chooses Export in the row menu of the diagram named `name` and returns the downloaded file's path. */
  async exportDiagram(name: string): Promise<string> {
    await this.openDiagramMenu();
    const row = this.diagramEntries().filter({ hasText: name }).first();
    await this.page.getByTestId(`${await row.getAttribute('data-testid')}.actions`).click();
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.page.getByTestId('diagram-app.export-diagram').click(),
    ]);
    return (await download.path()) ?? '';
  }

  /** Chooses Import in the diagram menu and picks the file at `file`. */
  async importDiagram(file: string): Promise<void> {
    await this.openDiagramMenu();
    const [chooser] = await Promise.all([
      this.page.waitForEvent('filechooser'),
      this.page.getByTestId('diagram-app.import-diagram').click(),
    ]);
    await chooser.setFiles(file);
  }

  /** Follows the first person in the presence list; the list closes once the follow opens their object. */
  async follow(): Promise<void> {
    await this.presence().first().click();
    await this.page.getByTestId('spacePlugin.presence.follow').first().click();
    // Opening the leader's object focuses its canvas, which closes the list; another click on the avatar would reopen it.
    await this.page.getByTestId('spacePlugin.presence.stopFollowing').waitFor({ state: 'detached' });
  }

  /** Clicks Stop on the followed person's row in the presence list. */
  async stopFollowing(): Promise<void> {
    await this.presence().first().click();
    await this.page.getByTestId('spacePlugin.presence.stopFollowing').click();
  }

  /** Zooms in about `at` with Ctrl and the wheel, then scrolls the canvas by `pan`. */
  async zoomAndPan(at: Point, pan: Point): Promise<void> {
    await this.page.mouse.move(at.x, at.y);
    await this.page.keyboard.down('Control');
    for (let i = 0; i < 4; i++) {
      await this.page.mouse.wheel(0, -120);
    }
    await this.page.keyboard.up('Control');
    await this.page.mouse.wheel(pan.x, pan.y);
  }

  /** Moves the pointer over the canvas, a little further each call, so a peer sees it move. */
  async hover(step: number): Promise<void> {
    await this.page.mouse.move(400 + (step % 10) * 20, 300 + (step % 10) * 10);
  }
}
