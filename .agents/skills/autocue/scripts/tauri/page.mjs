//
// Copyright 2026 DXOS.org
//

/**
 * A Playwright-shaped `page` over a WebDriver session, so `driver.mjs`, its overlay and the committed flow
 * scripts drive a Tauri webview with the code they already use against Chromium.
 *
 * Playwright cannot attach to WebKitGTK or WKWebView, but WebDriver can, and WebKit's WebDriver sends its
 * pointer and key actions as platform input events: the page sees trusted events, so CodeMirror takes typed
 * text and pointer-driven menus open, as they do for a person. Only the part of the `Page` and `Locator`
 * surface the scripts touch is implemented; anything else is absent rather than approximated.
 *
 * Selectors are resolved in the page by `selectors.mjs`, and every locator re-resolves on each call, as
 * Playwright's are lazy. Waits poll in short in-page slices, so a navigation or a slow script costs one slice.
 */

import { writeFile } from 'node:fs/promises';

import { installSelectors } from './selectors.mjs';

/** Longest single in-page wait; longer waits are several slices, each surviving a navigation. */
const SLICE_MS = 10_000;

/** W3C WebDriver key codepoints for the key names Playwright uses. */
const KEYS = {
  Backspace: '',
  Tab: '',
  Enter: '',
  Shift: '',
  Control: '',
  Alt: '',
  Escape: '',
  Space: ' ',
  PageUp: '',
  PageDown: '',
  End: '',
  Home: '',
  ArrowLeft: '',
  ArrowUp: '',
  ArrowRight: '',
  ArrowDown: '',
  Insert: '',
  Delete: '',
  Meta: '',
  ...Object.fromEntries(
    Array.from({ length: 12 }, (_, index) => [`F${index + 1}`, String.fromCharCode(0xe031 + index)]),
  ),
};

/** `KeyK` → `k`, `Digit1` → `1`, a named key → its codepoint, a single character → itself. */
const keyValue = (name) => {
  if (KEYS[name]) {
    return KEYS[name];
  }
  const match = /^(?:Key([A-Z])|Digit([0-9]))$/.exec(name);
  if (match) {
    return (match[1] ?? match[2]).toLowerCase();
  }
  if ([...name].length === 1) {
    return name;
  }
  throw new Error(`unsupported key: ${name}`);
};

/** `ControlOrMeta` is Playwright's portable modifier; Tauri on Linux is Control. */
const chordKeys = (chord) =>
  chord
    .split(/\+(?!$)/)
    .map((part) => keyValue(part === 'ControlOrMeta' ? (process.platform === 'darwin' ? 'Meta' : 'Control') : part));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Where a locator's steps are resolved to elements, in the page; installs the selector engine first. */
const RESOLVE = `
  (${installSelectors.toString()})();
  const resolve = (steps) => {
    let current = [document];
    let scoped = false;
    for (const step of steps) {
      if (step.selector !== undefined) {
        const found = new Set();
        for (const root of current) {
          for (const element of window.__autocueQuery(step.selector, root === document ? undefined : root)) {
            found.add(element);
          }
        }
        current = [...found];
        scoped = true;
      } else if (step.nth !== undefined) {
        const picked = step.nth < 0 ? current.at(step.nth) : current[step.nth];
        current = picked ? [picked] : [];
      } else if (step.hasText !== undefined) {
        const { textOf, textMatches } = window.__autocueText;
        current = current.filter((element) => textMatches(textOf(element), { text: step.hasText, exact: false }));
      }
    }
    return scoped ? current : [];
  };
`;

/**
 * Wraps `body` (which sees `arg`, `resolve` and must return a value or a promise) as an async WebDriver
 * script. Values come back JSON-cloned, except elements, which WebDriver turns into references.
 */
const asyncScript = (body) => `
  const done = arguments[arguments.length - 1];
  const arg = arguments[0];
  ${RESOLVE}
  const clone = (value) => {
    if (value instanceof Element) return value;
    if (value === undefined) return null;
    try { return JSON.parse(JSON.stringify(value)); } catch { return String(value); }
  };
  Promise.resolve()
    .then(async () => { ${body} })
    .then((value) => done({ ok: true, value: clone(value) }), (error) => done({ ok: false, error: String(error?.stack ?? error) }));
`;

/** In the page: polls `check(elements)` until truthy or `ms` passes; answers the last result. */
const POLL = `
  const until = async (steps, ms, check) => {
    const end = Date.now() + ms;
    for (;;) {
      const result = check(resolve(steps));
      if (result || Date.now() >= end) return result;
      await new Promise((next) => setTimeout(next, 100));
    }
  };
  const visible = (element) => window.__autocueText.isVisible(element);
`;

class EvaluateError extends Error {}

/**
 * @param {{ session: Awaited<ReturnType<typeof import('./webdriver.mjs').createSession>> }} options
 */
export const createTauriPage = ({ session }) => {
  let defaultTimeout = 5_000;
  let lastPointer = { x: 0, y: 0 };

  const run = async (body, arg) => {
    const result = await session.executeAsync(asyncScript(body), [arg ?? null]);
    if (!result?.ok) {
      throw new EvaluateError(result?.error ?? 'script failed');
    }
    return result.value;
  };

  /** Retries through navigations: a script torn down by a reload is not a failed wait. */
  const slice = async (body, arg, deadline) => {
    for (;;) {
      try {
        return await run(body, { ...arg, ms: Math.max(0, Math.min(SLICE_MS, deadline - Date.now())) });
      } catch (error) {
        if (error instanceof EvaluateError || Date.now() >= deadline) {
          throw error;
        }
        await sleep(250);
      }
    }
  };

  const pointer = (actions) =>
    session.performActions([{ type: 'pointer', id: 'mouse', parameters: { pointerType: 'mouse' }, actions }]);
  const keys = (actions) => session.performActions([{ type: 'key', id: 'keyboard', actions }]);
  const typeText = async (text, delay = 0) => {
    const actions = [];
    for (const char of text) {
      actions.push({ type: 'keyDown', value: char }, { type: 'keyUp', value: char });
      if (delay > 0) {
        actions.push({ type: 'pause', duration: delay });
      }
    }
    if (actions.length > 0) {
      await keys(actions);
    }
  };

  const moveTo = async ({ x, y }, duration = 0) => {
    const point = { x: Math.round(x), y: Math.round(y) };
    await pointer([{ type: 'pointerMove', origin: 'viewport', duration, ...point }]);
    lastPointer = point;
  };

  const buttonCode = (button = 'left') => ({ left: 0, middle: 1, right: 2 })[button] ?? 0;

  class Locator {
    constructor(steps) {
      this.steps = steps;
    }

    toString() {
      return this.steps
        .map((step) => step.selector ?? (step.nth !== undefined ? `nth=${step.nth}` : `has-text=${step.hasText}`))
        .join(' >> ');
    }

    #with(step) {
      return new Locator([...this.steps, step]);
    }

    locator(selector, { hasText } = {}) {
      const next = this.#with({ selector });
      return hasText === undefined ? next : next.#with({ hasText });
    }

    getByTestId(id) {
      return this.#with({ selector: `[data-testid="${id}"]` });
    }

    getByText(text, { exact = false } = {}) {
      return this.#with({ selector: `text=${exact ? JSON.stringify(text) : text}` });
    }

    filter({ hasText }) {
      return this.#with({ hasText });
    }

    first() {
      return this.#with({ nth: 0 });
    }

    last() {
      return this.#with({ nth: -1 });
    }

    nth(index) {
      return this.#with({ nth: index });
    }

    async count() {
      return run('return resolve(arg.steps).length;', { steps: this.steps });
    }

    async waitFor({ state = 'visible', timeout = defaultTimeout } = {}) {
      const deadline = Date.now() + timeout;
      for (;;) {
        const ok = await slice(
          `${POLL}
          return until(arg.steps, arg.ms, (elements) => {
            switch (arg.state) {
              case 'attached': return elements.length > 0;
              case 'detached': return elements.length === 0;
              case 'hidden': return elements.length === 0 || !visible(elements[0]);
              default: return elements.length > 0 && visible(elements[0]);
            }
          });`,
          { steps: this.steps, state },
          deadline,
        );
        if (ok) {
          return;
        }
        if (Date.now() >= deadline) {
          throw new Error(`Timeout ${timeout}ms exceeded waiting for locator('${this}') to be ${state}`);
        }
      }
    }

    /**
     * Waits until the first match can take a pointer at its center — visible, enabled, and on top there —
     * scrolling it into view first, as Playwright's actionability checks do. Answers the point.
     */
    async #actionable(timeout = defaultTimeout, { enabled = true } = {}) {
      const deadline = Date.now() + timeout;
      let last = 'no element';
      for (;;) {
        const result = await slice(
          `${POLL}
          let reason = 'no element';
          const point = await until(arg.steps, arg.ms, (elements) => {
            const element = elements[0];
            if (!element) { reason = 'no element'; return null; }
            if (!visible(element)) { reason = 'not visible'; return null; }
            if (arg.enabled && (element.disabled || element.getAttribute('aria-disabled') === 'true')) {
              reason = 'disabled'; return null;
            }
            let rect = element.getBoundingClientRect();
            if (rect.bottom < 0 || rect.right < 0 || rect.top > innerHeight || rect.left > innerWidth) {
              element.scrollIntoView({ block: 'center', inline: 'center' });
              rect = element.getBoundingClientRect();
            }
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            const hit = document.elementFromPoint(x, y);
            if (hit && hit !== element && !element.contains(hit) && !hit.contains(element)) {
              reason = 'covered by ' + (hit.getAttribute('data-testid') || hit.tagName.toLowerCase());
              return null;
            }
            return { x, y };
          });
          return point ?? { reason };`,
          { steps: this.steps, enabled },
          deadline,
        );
        if (result?.x !== undefined) {
          return result;
        }
        last = result?.reason ?? last;
        if (Date.now() >= deadline) {
          throw new Error(`Timeout ${timeout}ms exceeded waiting for locator('${this}') to be actionable (${last})`);
        }
      }
    }

    async click({ timeout, button } = {}) {
      const point = await this.#actionable(timeout);
      await moveTo(point);
      await pointer([
        { type: 'pointerDown', button: buttonCode(button) },
        { type: 'pointerUp', button: buttonCode(button) },
      ]);
    }

    async hover({ timeout } = {}) {
      await moveTo(await this.#actionable(timeout, { enabled: false }));
    }

    /** Focuses the first match and selects its whole value, so typed keys replace it. */
    async #focusAndSelect(timeout) {
      await this.waitFor({ state: 'visible', timeout });
      await run(
        `const element = resolve(arg.steps)[0];
        element.focus();
        if (typeof element.select === 'function') {
          element.select();
        } else if (element.isContentEditable) {
          const range = document.createRange();
          range.selectNodeContents(element);
          const selection = getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        }`,
        { steps: this.steps },
      );
    }

    async fill(value, { timeout } = {}) {
      await this.#focusAndSelect(timeout);
      if (value === '') {
        await keys([
          { type: 'keyDown', value: KEYS.Backspace },
          { type: 'keyUp', value: KEYS.Backspace },
        ]);
      } else {
        await typeText(value);
      }
    }

    async pressSequentially(value, { delay = 0, timeout } = {}) {
      await this.waitFor({ state: 'visible', timeout });
      await run('resolve(arg.steps)[0].focus();', { steps: this.steps });
      await typeText(value, delay);
    }

    async boundingBox({ timeout = defaultTimeout } = {}) {
      await this.waitFor({ state: 'attached', timeout });
      return run(
        `const element = resolve(arg.steps)[0];
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return rect.width === 0 && rect.height === 0 ? null : { x: rect.x, y: rect.y, width: rect.width, height: rect.height };`,
        { steps: this.steps },
      );
    }

    async evaluate(fn, arg) {
      await this.waitFor({ state: 'attached' });
      return run(`return (${fn.toString()})(resolve(arg.steps)[0], arg.arg);`, { steps: this.steps, arg });
    }

    async evaluateAll(fn, arg) {
      return run(`return (${fn.toString()})(resolve(arg.steps), arg.arg);`, { steps: this.steps, arg });
    }

    async innerText({ timeout } = {}) {
      await this.waitFor({ state: 'attached', timeout });
      return run('return resolve(arg.steps)[0].innerText;', { steps: this.steps });
    }

    async textContent({ timeout } = {}) {
      await this.waitFor({ state: 'attached', timeout });
      return run('return resolve(arg.steps)[0].textContent;', { steps: this.steps });
    }

    async getAttribute(name, { timeout } = {}) {
      await this.waitFor({ state: 'attached', timeout });
      return run('return resolve(arg.steps)[0].getAttribute(arg.name);', { steps: this.steps, name });
    }

    async isVisible() {
      return run(
        `const element = resolve(arg.steps)[0]; return !!element && window.__autocueText.isVisible(element);`,
        {
          steps: this.steps,
        },
      );
    }

    async isChecked({ timeout } = {}) {
      await this.waitFor({ state: 'attached', timeout });
      return run(
        `const element = resolve(arg.steps)[0];
        return 'checked' in element ? element.checked : element.getAttribute('aria-checked') === 'true';`,
        { steps: this.steps },
      );
    }

    async scrollIntoViewIfNeeded({ timeout } = {}) {
      await this.waitFor({ state: 'attached', timeout });
      await run(
        `const element = resolve(arg.steps)[0];
        const rect = element.getBoundingClientRect();
        if (rect.top < 0 || rect.bottom > innerHeight) element.scrollIntoView({ block: 'center' });`,
        { steps: this.steps },
      );
    }
  }

  const root = new Locator([]);

  const page = {
    setDefaultTimeout: (ms) => {
      defaultTimeout = ms;
    },
    url: () => page.currentUrl,
    currentUrl: 'about:blank',
    async goto(url) {
      await session.navigate(url);
      page.currentUrl = await session.url();
    },
    /** A string is an expression, and a function it evaluates to is called, as in Playwright. */
    async evaluate(fn, arg) {
      if (typeof fn === 'string') {
        return run(
          `const value = (0, eval)(arg.source);
          return typeof value === 'function' ? value() : value;`,
          { source: fn },
        );
      }
      return run(`return (${fn.toString()})(arg.arg);`, { arg });
    },
    async waitForFunction(fn, arg, { timeout = 30_000, polling = 100 } = {}) {
      const deadline = Date.now() + timeout;
      for (;;) {
        const value = await slice(
          `const end = Date.now() + arg.ms;
          const check = ${fn.toString()};
          for (;;) {
            const value = await check(arg.arg);
            if (value || Date.now() >= end) return value;
            await new Promise((next) => setTimeout(next, arg.polling));
          }`,
          { arg, polling },
          deadline,
        );
        if (value) {
          return value;
        }
        if (Date.now() >= deadline) {
          throw new Error(`Timeout ${timeout}ms exceeded waiting for function`);
        }
      }
    },
    waitForTimeout: (ms) => sleep(ms),
    async screenshot({ path } = {}) {
      const png = Buffer.from(await session.screenshot(), 'base64');
      if (path) {
        await writeFile(path, png);
      }
      return png;
    },
    locator: (selector, options) => root.locator(selector, options),
    getByTestId: (id) => root.getByTestId(id),
    getByText: (text, options) => root.getByText(text, options),
    keyboard: {
      async press(chord) {
        const values = chordKeys(chord);
        await keys([
          ...values.map((value) => ({ type: 'keyDown', value })),
          ...values.toReversed().map((value) => ({ type: 'keyUp', value })),
        ]);
      },
      type: (text, { delay } = {}) => typeText(text, delay),
    },
    mouse: {
      move: (x, y, { steps = 1 } = {}) => moveTo({ x, y }, steps > 1 ? steps * 16 : 0),
      down: ({ button } = {}) => pointer([{ type: 'pointerDown', button: buttonCode(button) }]),
      up: ({ button } = {}) => pointer([{ type: 'pointerUp', button: buttonCode(button) }]),
      click: async (x, y, { button } = {}) => {
        await moveTo({ x, y });
        await pointer([
          { type: 'pointerDown', button: buttonCode(button) },
          { type: 'pointerUp', button: buttonCode(button) },
        ]);
      },
    },
    get pointer() {
      return lastPointer;
    },
    /** WebDriver pushes no page events; kept so callers that subscribe need no branch. */
    on: () => {},
  };

  return page;
};
