//
// Copyright 2026 DXOS.org
//

import { chromium } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { describe, test } from 'vitest';

import { cliHarness } from './cli-harness.ts';

const { root, scratch, file, deus } = cliHarness('explorer-browser-');

const SANDBOX_CHROMIUM = '/opt/pw-browsers/chromium';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
};

/** How many definitions use `Shapes.square`: enough that "Used by" needs more than one page. */
const USERS = 130;

// The explorer app in Chromium (D269, D270): what the page does with the files `deus explore --out` writes.
describe('the explorer in a browser', () => {
  test(
    'a definition card pages long lists, lifts out its checks and keeps its hash on a phone',
    { timeout: 300_000 },
    async ({ expect, onTestFinished }) => {
      const c = ['--codebase', join(scratch, 'codebase')];
      deus('init', '--empty', ...c);
      deus('add', join(root, 'deus/builtins.deus'), join(root, 'deus/prelude.deus'), ...c);
      const shapes = [
        'namespace Shapes',
        '/-- The area of a square. -/',
        'def square (side : Int) : Int := side * side',
        'test squareOfTwo := square 2 == 4',
        ...Array.from({ length: USERS }, (_, at) => `def user${at} : Int := square ${at}`),
        'end Shapes',
      ];
      expect(deus('add', file('shapes.deus', shapes.join('\n')), ...c).code).toBe(0);
      process.env.DEUS_HOME = root;
      const out = join(scratch, 'site');
      expect(deus('explore', '--out', out, ...c)).toMatchObject({ stderr: '', code: 0 });

      const server = createServer((request, response) => {
        const path = join(out, request.url === '/' ? 'index.html' : (request.url ?? '').split(/[?#]/)[0]);
        try {
          const body = readFileSync(path);
          response.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
          response.end(body);
        } catch {
          response.writeHead(404).end();
        }
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      onTestFinished(() => void server.close());
      const address = server.address();
      if (address === null || typeof address === 'string') {
        throw new Error('the test server has no port');
      }

      const browser = await chromium.launch({
        // The cloud sandbox keeps one Chromium at a fixed path; elsewhere Playwright finds its own.
        executablePath: process.env.CHROMIUM ?? (existsSync(SANDBOX_CHROMIUM) ? SANDBOX_CHROMIUM : undefined),
        args: ['--no-sandbox'],
      });
      onTestFinished(() => browser.close());
      const errors: string[] = [];
      const open = async (width: number) => {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(`http://127.0.0.1:${address.port}/#d:Shapes.square`);
        await page.locator('.card details.section h3').first().waitFor();
        return page;
      };

      const page = await open(1280);
      const section = (title: string) =>
        page.locator('.card details.section').filter({ has: page.locator(`h3:text-matches("^${title}")`) });
      const shown = (title: string) => section(title).locator('ul.rows:not([hidden]) > li').count();

      // The test that uses `square` is lifted out of "Used by", and its row leaves out the `Bool` every test has.
      await expect(section('Checked by').locator('li').allTextContents()).resolves.toEqual([
        expect.stringContaining('Shapes.squareOfTwo'),
      ]);
      await expect(section('Checked by').locator('.row-sig').count()).resolves.toBe(0);

      // "Used by" opens 24 rows and adds 100 a click, naming what remains.
      await section('Used by').locator('summary').click();
      const more = section('Used by').locator('[data-more]');
      expect(await shown('Used by')).toBe(24);
      await expect(more.textContent()).resolves.toBe(`Show 100 more of ${USERS + 1 - 24}`);
      await more.click();
      expect(await shown('Used by')).toBe(124);
      await expect(more.textContent()).resolves.toBe(`Show ${USERS + 1 - 124} more`);
      await more.click();
      expect(await shown('Used by')).toBe(USERS + 1);
      await expect(more.count()).resolves.toBe(0);

      // On a phone the hash stays on the card, on a line of its own, where it can be tapped to copy.
      const phone = await open(390);
      const chip = await phone.locator('.card .card-meta .hash-chip').first().boundingBox();
      expect(chip?.height).toBeGreaterThanOrEqual(32);
      expect(await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
      expect(errors).toEqual([]);
    },
  );
});
