//
// Copyright 2026 DXOS.org
//

import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

import { DiagramApp } from './diagram-app.ts';

// The service worker breaks routing and interception.
if (process.env.DX_PWA !== 'false') {
  throw new Error('run with DX_PWA=false');
}

test.describe('Files', () => {
  let app: DiagramApp;

  test.beforeEach(async ({ browser }) => {
    app = new DiagramApp(browser);
  });

  test.afterEach(async () => {
    await app.close();
  });

  test('an exported diagram imports as a new canvas diagram', { tag: ['@QA-9'] }, async () => {
    await app.open();
    await app.draw('node:rect', { x: 450, y: 250 }, { x: 650, y: 400 });
    await expect(app.nodes()).toHaveCount(1);
    const exportedFrom = app.path();

    const file = await test.step('Export', async () => {
      const path = await app.exportDiagram('Untitled');
      expect(await readFile(path, 'utf8')).toContain('<svg');
      return path;
    });

    await test.step('Import', async () => {
      await app.importDiagram(file);
      await expect.poll(() => app.path()).not.toBe(exportedFrom);
      await expect(app.nodes()).toHaveCount(1);
      await app.openDiagramMenu();
      await expect(app.diagramEntries()).toHaveCount(2);
    });
  });
});
