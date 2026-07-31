//
// Copyright 2026 DXOS.org
//

import { test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { INITIAL_URL } from './app-manager';
import { waitForReady } from './harness-helpers';

const REPORT_DIR = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  '..',
  '..',
  '..',
  '..',
  'test-results',
  'composer-app',
);

// One-off ground-truth probe: dump each activated surface module's bound role NSIDs from the
// live capability index, so role declarations can be generated rather than hand-extracted.
test('dump surface module roles', async ({ browser }) => {
  test.setTimeout(120_000);
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${INITIAL_URL}/?profiler=1`);
  await waitForReady(page);

  const dump = await page.evaluate(() => {
    const manager = (globalThis as any).composer?.manager;
    const capabilities = manager?.capabilities;
    const debug: any = {
      hasManager: !!manager,
      hasCapabilities: !!capabilities,
      capabilityKeys: capabilities ? Object.keys(capabilities) : [],
      managerKeys: manager ? Object.keys(manager) : [],
      registered: capabilities?.listRegisteredIdentifiers?.() ?? null,
      hasRegistry: !!manager?.registry,
    };
    const byModuleAtom = capabilities?._capabilitiesByModule?.('org.dxos.app-framework.capability.reactSurface');
    debug.hasAtom = !!byModuleAtom;
    let byModule: Record<string, any[]> = {};
    try {
      byModule = manager?.registry?.get?.(byModuleAtom) ?? {};
    } catch (err) {
      debug.registryError = String(err);
    }
    const result: Record<string, string[]> = {};
    for (const [moduleId, contributions] of Object.entries(byModule)) {
      const roles = new Set<string>();
      for (const definition of (contributions as any[]).flat()) {
        const role = definition?.role;
        for (const entry of Array.isArray(role) ? role : [role]) {
          if (typeof entry === 'string') {
            roles.add(entry);
          }
        }
      }
      result[moduleId] = [...roles].sort();
    }
    return { debug, result };
  });

  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(path.join(REPORT_DIR, 'surface-roles.json'), JSON.stringify(dump, null, 2));
  await context.close();
});
