//
// Copyright 2026 DXOS.org
//

import { type Browser, type Locator, type Page, expect } from '@playwright/test';

import { setupPage } from '@dxos/test-utils/playwright';

export const PORT = 9008;

// 127.0.0.1, not localhost: localhost resolves to ::1 first, and Firefox fails ICE on a page served over IPv6 loopback.
export const ORIGIN = `http://127.0.0.1:${PORT}`;

/** The invitation query parameter Composer reads and writes (spec F-5.2). */
export const INVITATION_PARAM = 'spaceInvitationCode';

export type Point = { x: number; y: number };

/** One person's browser profile driving the diagram app. */
export class DiagramApp {
  page!: Page;
  private _close?: () => Promise<void>;

  constructor(private readonly _browser: Browser) {}

  /** Opens `url` in a fresh profile and waits for the canvas or the join card. */
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
    await this.toolbar().or(this.joinStatus()).waitFor();
  }

  async close(): Promise<void> {
    await this._close?.();
  }

  path(): string {
    return new URL(this.page.url()).pathname;
  }

  // Locators.

  toolbar(): Locator {
    return this.page.getByTestId('canvas-toolbar');
  }

  joinStatus(): Locator {
    return this.page.getByTestId('diagram-app.join-status');
  }

  pill(): Locator {
    return this.page.getByTestId('diagram-app.pill');
  }

  /** The Views panel's shape rows; the layout row is there before anything is drawn. */
  shapes(): Locator {
    return this.page.locator('[data-testid^="views-row-"]:not([data-testid="views-row-layout"])');
  }

  presence(): Locator {
    return this.page.getByTestId('spacePlugin.presence.member');
  }

  remoteCursors(): Locator {
    return this.page.getByTestId('remote-cursor');
  }

  spaceEntries(): Locator {
    return this.page.getByTestId('diagram-app.space-list').locator('[data-testid^="diagram-app.space."]');
  }

  diagramEntries(): Locator {
    return this.page
      .getByTestId('diagram-app.diagram-list')
      .locator('[data-testid^="diagram-app.diagram."]:not([data-testid$=".actions"])');
  }

  // Actions.

  /** Drags out a shape with a toolbar tool, e.g. `node:rect`. */
  async draw(tool: string, from: Point, to: Point): Promise<void> {
    await this.page.getByTestId(`canvas.tool.${tool}`).click();
    await this.page.mouse.move(from.x, from.y);
    await this.page.mouse.down();
    await this.page.mouse.move(to.x, to.y, { steps: 8 });
    await this.page.mouse.up();
    await this.page.getByTestId('canvas.tool.select').click();
  }

  /** Opens Share, creates a multi-use invitation, and returns the link its copy button copies. */
  async share(): Promise<{ dialog: Locator; link: string }> {
    await this.page.getByTestId('diagram-app.share').click();
    const dialog = this.page.getByTestId('diagram-app.share-dialog');
    await dialog.getByTestId('membersContainer.createInvitation').click();
    await dialog.getByTestId('copy-invitation').click();
    const link = await this.page.evaluate(() => (window as any).__copied as string | undefined);
    expect(link, 'the copy button wrote no link').toBeDefined();
    return { dialog, link: link! };
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

  /** Moves the pointer over the canvas, a little further each call, so a peer sees it move. */
  async hover(step: number): Promise<void> {
    await this.page.mouse.move(400 + (step % 10) * 20, 300 + (step % 10) * 10);
  }
}
