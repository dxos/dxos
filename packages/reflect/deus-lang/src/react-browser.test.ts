//
// Copyright 2026 DXOS.org
//

import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';
import { describe, test } from 'vitest';

import { cliHarness } from './cli-harness.ts';

const { root, scratch } = cliHarness('react-browser-');

const SANDBOX_CHROMIUM = '/opt/pw-browsers/chromium';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json',
};

// Browser evidence for the JS target (task b2404fd2): the React example, compiled with `deus build --js` and
// bundled with React as `examples/react/build.sh` does, rendered and used in Chromium.
describe('DEUS × React in a browser', () => {
  test('the todo app renders, counts and keeps a list', { timeout: 300_000 }, async ({ expect, onTestFinished }) => {
    const out = join(scratch, 'react');
    const built = spawnSync('bash', [join(root, 'examples/react/build.sh'), out], {
      env: { ...process.env, DEUS_CODEBASE: join(scratch, 'react-codebase') },
      encoding: 'utf8',
    });
    expect(built.status, built.stderr).toBe(0);

    const server = createServer((request, response) => {
      const path = join(out, request.url === '/' ? 'index.html' : (request.url ?? '').split('?')[0]);
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
    const { port } = address;

    const browser = await chromium.launch({
      // The cloud sandbox keeps one Chromium at a fixed path; elsewhere Playwright finds its own.
      executablePath: process.env.CHROMIUM ?? (existsSync(SANDBOX_CHROMIUM) ? SANDBOX_CHROMIUM : undefined),
      args: ['--no-sandbox'],
    });
    onTestFinished(() => browser.close());
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${port}/`);

    // React.component runs each DEUS function under React; the counter starts where `app` says.
    await expect.poll(() => page.locator('.counter .value').textContent()).toBe('3');
    await page.click('.counter .inc');
    await page.click('.counter .inc');
    await page.click('.counter .dec');
    await expect.poll(() => page.locator('.counter .value').textContent()).toBe('4');

    // The list: Hooks.useState for its items and the draft, a form submit, and a toggle per item.
    await expect.poll(() => page.locator('.todos .left').textContent()).toBe('3 of 3 left');
    await page.fill('.todos input[placeholder]', 'Prove it in a browser');
    await page.click('.todos button[type=submit]');
    await expect.poll(() => page.locator('.todos li').count()).toBe(4);
    await expect.poll(() => page.locator('.todos li').last().textContent()).toBe('Prove it in a browser');
    await page.locator('.todos li').first().click();
    await expect.poll(() => page.locator('.todos li.done').count()).toBe(1);
    await expect.poll(() => page.locator('.todos .left').textContent()).toBe('3 of 4 left');
    expect(errors).toEqual([]);
  });
});
