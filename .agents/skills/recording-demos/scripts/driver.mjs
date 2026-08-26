//
// Copyright 2026 DXOS.org
//

/**
 * A browser the agent drives one gesture at a time, recording the whole session to a `.webm`.
 *
 * Playwright specs are the wrong shape for a demo: the script decides every step up front, so a flow
 * whose next gesture depends on what the last one rendered cannot be expressed, and a `do:` step with
 * no operation behind it cannot be performed at all. This keeps one browser and one recording context
 * alive behind a loopback HTTP server, so the agent issues `click`/`fill`/`drag` as separate turns and
 * reads the result — or a screenshot — before choosing the next one.
 *
 *   node driver.mjs --port 7333 --url http://localhost:4173 --out /tmp/demo
 *   curl -sS localhost:7333/cmd -d '{"op":"click","selector":"[data-testid=x]"}'
 *   curl -sS localhost:7333/cmd -d '{"op":"stop"}'      # finalizes and prints the video path
 *
 * The video is written only on context close, so `stop` is what produces it; a crashed driver leaves
 * nothing behind.
 */

import { chromium } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = { port: 7333, url: 'http://localhost:4173', out: 'demo-out', width: 1280, height: 800 };
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index].replace(/^--/, '');
    const value = args[index + 1];
    options[key] = /^\d+$/.test(value) ? Number(value) : value;
  }
  return options;
};

const options = parseArgs();
mkdirSync(options.out, { recursive: true });

/**
 * Binding to loopback is not access control: any page the browser has open can POST here cross-origin
 * in `no-cors` mode, and while the response is opaque to it the command still runs — `eval` and `goto`
 * included. A token in a non-safelisted header cannot be set by such a request (it would force a
 * preflight, which this server never approves), so requiring one closes that path.
 */
const TOKEN_HEADER = 'x-demo-token';
const token = randomUUID();

// The cloud sandbox needs a pinned executable, the egress proxy passed as an arg, and a TLS 1.2 cap;
// gated so a real desktop run is never silently downgraded (see the `cloud-sandbox` skill).
const sandbox = process.env.CLAUDE_CODE_REMOTE ? process.env.HTTPS_PROXY : undefined;
const browser = await chromium.launch({
  executablePath: sandbox ? '/opt/pw-browsers/chromium' : undefined,
  args: sandbox
    ? [
        '--no-sandbox',
        `--proxy-server=${sandbox}`,
        '--proxy-bypass-list=127.0.0.1;localhost',
        '--ssl-version-max=tls1.2',
      ]
    : [],
});

const viewport = { width: options.width, height: options.height };
const context = await browser.newContext({
  viewport,
  recordVideo: { dir: options.out, size: viewport },
});
const page = await context.newPage();

/**
 * When each caption went up, measured from the first frame of the recording. `trim-static.mjs` remaps
 * these onto the trimmed timeline and turns them into chapters and a WebVTT track, so the steps stay
 * navigable instead of living only in burned-in pixels.
 */
const started = Date.now();
const timeline = [];

/** Captions are re-injected per call because a navigation wipes the overlay. */
const CAPTION_ID = '__demo_caption__';

const showCaption = async (text, subtitle) => {
  await page.evaluate(
    ({ id, text, subtitle }) => {
      document.getElementById(id)?.remove();
      const banner = document.createElement('div');
      banner.id = id;
      banner.style.cssText = [
        'position:fixed',
        'left:0',
        'right:0',
        'bottom:0',
        'z-index:2147483647',
        'padding:14px 20px',
        'background:rgba(17,17,17,0.92)',
        'color:#fff',
        'font:600 16px/1.4 ui-sans-serif,system-ui,sans-serif',
        'pointer-events:none',
        'text-align:center',
      ].join(';');
      banner.textContent = text;
      if (subtitle) {
        const line = document.createElement('div');
        line.style.cssText = 'opacity:0.65;font-weight:400;font-size:13px;margin-top:4px';
        line.textContent = subtitle;
        banner.appendChild(line);
      }
      document.body.appendChild(banner);
    },
    { id: CAPTION_ID, text, subtitle },
  );
};

const locator = (command) =>
  command.text ? page.getByText(command.text, { exact: !!command.exact }) : page.locator(command.selector);

/** Center of an element, for gestures that need real coordinates rather than a locator. */
const center = async (selector) => {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) {
    throw new Error(`no bounding box: ${selector}`);
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

const handlers = {
  goto: async (command) => {
    await page.goto(command.url ?? options.url, { waitUntil: command.waitUntil ?? 'domcontentloaded' });
    return { url: page.url() };
  },
  click: async (command) => {
    await locator(command)
      .first()
      .click({ timeout: command.timeout ?? 15_000, button: command.button ?? 'left' });
    return {};
  },
  fill: async (command) => {
    await locator(command)
      .first()
      .fill(command.value, { timeout: command.timeout ?? 15_000 });
    return {};
  },
  type: async (command) => {
    await locator(command)
      .first()
      .pressSequentially(command.value, { delay: command.delay ?? 60 });
    return {};
  },
  press: async (command) => {
    await page.keyboard.press(command.key);
    return {};
  },
  hover: async (command) => {
    await locator(command)
      .first()
      .hover({ timeout: command.timeout ?? 15_000 });
    return {};
  },
  /**
   * A slow, stepped mouse drag rather than `dragTo`. The chess board's drop targets come from
   * pragmatic-drag-and-drop, which only arms its drop zones after it sees movement — a single
   * synthetic jump lands on `canDrop` having never fired.
   */
  drag: async (command) => {
    const from = command.fromXY ?? (await center(command.from));
    const to = command.toXY ?? (await center(command.to));
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    const steps = command.steps ?? 20;
    for (let step = 1; step <= steps; step++) {
      await page.mouse.move(from.x + ((to.x - from.x) * step) / steps, from.y + ((to.y - from.y) * step) / steps);
      await page.waitForTimeout(command.stepDelay ?? 16);
    }
    await page.mouse.up();
    return { from, to };
  },
  waitFor: async (command) => {
    await locator(command)
      .first()
      .waitFor({ state: command.state ?? 'visible', timeout: command.timeout ?? 30_000 });
    return {};
  },
  text: async (command) => {
    const target = command.selector || command.text ? locator(command).first() : page.locator('body');
    return { text: (await target.innerText()).slice(0, command.limit ?? 4_000) };
  },
  count: async (command) => ({ count: await locator(command).count() }),
  eval: async (command) => ({ value: await page.evaluate(command.expr) }),
  caption: async (command) => {
    await showCaption(command.value, command.subtitle);
    timeline.push({ ms: Date.now() - started, text: command.value, subtitle: command.subtitle });
    if (command.hold) {
      await page.waitForTimeout(command.hold);
    }
    return { at: (Date.now() - started) / 1000 };
  },
  clearCaption: async () => {
    await page.evaluate((id) => document.getElementById(id)?.remove(), CAPTION_ID);
    return {};
  },
  sleep: async (command) => {
    await page.waitForTimeout(command.ms ?? 1_000);
    return {};
  },
  screenshot: async (command) => {
    // `basename` because a caller-supplied name is not a path: `../` would escape the output directory.
    const file = path.join(options.out, path.basename(command.name ?? `shot-${Date.now()}.png`));
    await page.screenshot({ path: file, fullPage: !!command.fullPage });
    return { file };
  },
  stop: async () => {
    const timelineFile = path.join(options.out, 'timeline.json');
    writeFileSync(timelineFile, JSON.stringify({ started, steps: timeline }, null, 2));
    await context.close();
    await browser.close();
    const video = readdirSync(options.out).find((entry) => entry.endsWith('.webm'));
    return { video: video ? path.join(options.out, video) : undefined, timeline: timelineFile, steps: timeline.length };
  },
};

/** A command is a few hundred bytes; anything larger is a mistake or an attempt to exhaust the heap. */
const MAX_BODY = 64 * 1024;

const server = createServer((request, response) => {
  // Headers are complete before the first `data` event, so the token is checked before a single byte of
  // body is buffered — an unauthorized caller cannot make this process accumulate anything.
  if (request.headers[TOKEN_HEADER] !== token) {
    response.writeHead(403, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: false, error: `missing or bad ${TOKEN_HEADER}` }));
    return request.destroy();
  }

  let body = '';
  request.on('data', (chunk) => {
    body += chunk;
    if (body.length > MAX_BODY) {
      response.writeHead(413, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ ok: false, error: `body exceeds ${MAX_BODY} bytes` }));
      request.destroy();
    }
  });
  request.on('end', async () => {
    if (request.destroyed) {
      return;
    }

    let command;
    try {
      command = JSON.parse(body || '{}');
    } catch (error) {
      response.writeHead(400, { 'content-type': 'application/json' });
      return response.end(JSON.stringify({ ok: false, error: `bad json: ${error.message}` }));
    }

    const handler = handlers[command.op];
    if (!handler) {
      response.writeHead(400, { 'content-type': 'application/json' });
      return response.end(
        JSON.stringify({ ok: false, error: `unknown op: ${command.op}`, ops: Object.keys(handlers) }),
      );
    }

    try {
      const result = await handler(command);
      response.writeHead(200, { 'content-type': 'application/json' });
      // Shutdown runs from the write callback: exiting as soon as `end` returns can cut the response
      // off before it flushes, and that response carries the video path.
      response.end(JSON.stringify({ ok: true, ...result }), () => {
        if (command.op === 'stop') {
          // Exit from inside `close`, and drop keep-alive sockets so it can actually complete: dropping
          // the exit entirely leaves the process alive on an idle client socket, and exiting before the
          // write callback truncates the response that carries the video path.
          server.close(() => process.exit(0));
          server.closeAllConnections();
        }
      });
    } catch (error) {
      // Errors are reported, never fatal: a failed gesture is a finding the agent acts on, and killing
      // the driver would lose the recording of the failure.
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ ok: false, error: error.message?.split('\n').slice(0, 6).join('\n') }));
    }
  });
});

// Loopback only, and token-gated — this server drives a real browser and takes arbitrary `eval`.
server.listen(options.port, '127.0.0.1', () => {
  // Also written to the output directory so a caller can read it without scraping stdout.
  writeFileSync(path.join(options.out, 'token'), token);
  console.log(`driver ready on http://127.0.0.1:${options.port} out=${options.out}`);
  console.log(`token ${token}`);
});
