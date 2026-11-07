//
// Copyright 2026 DXOS.org
//

import { type Locator, type Page, expect } from '@playwright/test';

import { type AppManager } from '../app-manager.ts';

/** Drawing variants by the label the create panel lists them under. */
export type DrawingVariant = 'svg' | 'tldraw';

const SURFACE_TEST_IDS: Record<DrawingVariant, string> = {
  svg: 'illustrator.svg',
  tldraw: 'canvas',
};

export const Drawing = {
  /** Creates a drawing of `variant` from the space's create dialog. */
  createDrawing: async (app: AppManager, variant: DrawingVariant) => {
    await app.currentWorkspace.getByTestId('spacePlugin.createObject').first().click();
    await app.page.getByTestId('create-object-form.type.org.dxos.type.drawing').click({ timeout: 15_000 });
    await app.page.getByTestId('create-drawing-panel.variant-input').fill(variant);
    const dialog = app.page.locator('[data-scope="dialog"][data-part="content"][data-state="open"]');
    // The variant search is fuzzy, so pick the row whose label is exactly the variant.
    await dialog
      .locator('[data-value]')
      .filter({ hasText: new RegExp(`^${variant}$`) })
      .click();
    await dialog.getByTestId('save-button').click();
    await expect(dialog).toHaveCount(0, { timeout: 30_000 });
  },

  /** The element a variant draws on, where the pointer is tracked. */
  getSurface: (locator: Locator, variant: DrawingVariant) => locator.getByTestId(SURFACE_TEST_IDS[variant]),

  getRemoteCursors: (locator: Locator) => locator.getByTestId('remote-cursor'),

  /** Moves the mouse across the surface in small steps, as a person would. */
  hover: async (page: Page, surface: Locator) => {
    const box = await surface.boundingBox();
    if (!box) {
      throw new Error('the drawing surface is not laid out');
    }
    const { x, y, width, height } = box;
    await page.mouse.move(x + width * 0.3, y + height * 0.3);
    await page.mouse.move(x + width * 0.5, y + height * 0.5, { steps: 10 });
  },
} as const;
