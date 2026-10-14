//
// Copyright 2026 DXOS.org
//

/**
 * The part of Playwright's selector language the autocue ops and committed flows use, evaluated inside a
 * webview that Playwright cannot attach to. WebDriver finds elements by CSS or XPath only, and a flow reads
 * `button:visible:has-text("Open sidebar")` or `role=option[name="Europe/London"] >> nth=0`, so the
 * selector is resolved here, in the page, and the element comes back as a WebDriver reference.
 *
 * Supported, with Playwright's semantics:
 *
 * - `a >> b` chaining, where each part searches inside the previous part's matches;
 * - `nth=N` (negative counts from the end), `text=foo` (case-insensitive substring), `text="foo"`
 *   (exact), `css=…`, `role=name[name="…"]` (case-insensitive substring of the accessible name);
 * - CSS with `:visible`, `:has-text("…")`, `:text("…")`, `:text-is("…")`, and `:has(…)` whose argument may
 *   itself use any of these; everything else in a compound goes to the browser's own `matches`.
 *
 * Open shadow roots are not pierced, unlike Playwright: Composer's own surfaces are light DOM.
 */

/**
 * Installed with `executeScript`, idempotent per `version`. Self-contained, since it is serialized into the page.
 * Exposes `window.__autocueQuery(selector, scope?)`, which answers the matching elements in document order.
 */
export const installSelectors = (version) => {
  // Keyed by the engine's own source, so an edited engine replaces the copy a long-lived page already holds.
  if (window.__autocueQuery && window.__autocueVersion === version) {
    return;
  }
  window.__autocueVersion = version;

  const CUSTOM = new Set(['visible', 'has-text', 'text', 'text-is', 'has', 'not']);

  const normalize = (text) =>
    String(text ?? '')
      .replace(/\s+/g, ' ')
      .trim();

  /** Text as Playwright reads it: script and style bodies excluded, whitespace collapsed. */
  const textOf = (element) => {
    if (element instanceof HTMLInputElement && ['button', 'submit', 'reset'].includes(element.type)) {
      return normalize(element.value);
    }
    let text = '';
    const walk = (node) => {
      for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          text += child.nodeValue;
        } else if (child.nodeType === Node.ELEMENT_NODE && !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(child.tagName)) {
          walk(child);
        }
      }
    };
    walk(element);
    return normalize(text);
  };

  const isVisible = (element) => {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return false;
    }
    return getComputedStyle(element).visibility !== 'hidden';
  };

  /** A quoted argument (`"a"`, `'a'`) unquoted, with a trailing `s`/`i` flag for exact / case-insensitive. */
  const parseText = (raw) => {
    const value = raw.trim();
    const quoted = /^(["'])(.*)\1([si]?)$/s.exec(value);
    if (quoted) {
      return { text: quoted[2].replace(/\\(.)/g, '$1'), exact: quoted[3] !== 'i' };
    }
    return { text: value, exact: false };
  };

  const textMatches = (actual, { text, exact }) =>
    exact ? actual === normalize(text) : actual.toLowerCase().includes(normalize(text).toLowerCase());

  /** Splits `source` on `separator` wherever it is outside quotes, brackets and parentheses. */
  const splitTopLevel = (source, separator) => {
    const parts = [];
    let depth = 0;
    let quote;
    let start = 0;
    for (let index = 0; index < source.length; index++) {
      const char = source[index];
      if (quote) {
        if (char === '\\') {
          index++;
        } else if (char === quote) {
          quote = undefined;
        }
        continue;
      }
      if (char === '"' || char === "'") {
        quote = char;
      } else if (char === '(' || char === '[') {
        depth++;
      } else if (char === ')' || char === ']') {
        depth--;
      } else if (depth === 0 && source.startsWith(separator, index)) {
        parts.push(source.slice(start, index));
        start = index + separator.length;
        index += separator.length - 1;
      }
    }
    parts.push(source.slice(start));
    return parts;
  };

  /**
   * One CSS complex selector as `[{ combinator, native, custom }]`, where `native` is the compound minus the
   * pseudo-classes the browser does not know and `custom` holds those. The first entry's combinator is the
   * leading one of a relative selector (`:has(> a)`), or a descendant search.
   */
  const parseComplex = (source) => {
    const steps = [];
    let combinator = ' ';
    let native = '';
    let custom = [];
    let depth = 0;
    let quote;
    const flush = () => {
      if (native || custom.length > 0) {
        steps.push({ combinator, native: native || '*', custom });
      }
      native = '';
      custom = [];
    };
    const text = source.trim();
    for (let index = 0; index < text.length; index++) {
      const char = text[index];
      if (quote) {
        native += char;
        if (char === '\\') {
          native += text[++index] ?? '';
        } else if (char === quote) {
          quote = undefined;
        }
        continue;
      }
      if (char === '"' || char === "'") {
        quote = char;
        native += char;
        continue;
      }
      // Brackets and parentheses alike: `:not(.a .b)` and `:nth-child(2n + 1)` hold no combinator of this compound.
      if (char === '[' || char === '(') {
        depth++;
      } else if (char === ']' || char === ')') {
        depth--;
      }
      if (depth === 0 && char === ':' && text[index + 1] !== ':') {
        const match = /^:([a-zA-Z-]+)/.exec(text.slice(index));
        const name = match?.[1];
        if (name && CUSTOM.has(name)) {
          let end = index + match[0].length;
          let arg;
          if (text[end] === '(') {
            let level = 0;
            let argQuote;
            for (let cursor = end; cursor < text.length; cursor++) {
              const inner = text[cursor];
              if (argQuote) {
                if (inner === '\\') {
                  cursor++;
                } else if (inner === argQuote) {
                  argQuote = undefined;
                }
                continue;
              }
              if (inner === '"' || inner === "'") {
                argQuote = inner;
              } else if (inner === '(') {
                level++;
              } else if (inner === ')' && --level === 0) {
                arg = text.slice(end + 1, cursor);
                end = cursor + 1;
                break;
              }
            }
          }
          custom.push({ name, arg });
          index = end - 1;
          continue;
        }
      }
      if (depth === 0 && /[\s>+~]/.test(char)) {
        // A run of whitespace around at most one explicit combinator.
        let cursor = index;
        let explicit;
        while (cursor < text.length && /[\s>+~]/.test(text[cursor])) {
          if (text[cursor] !== ' ' && !/\s/.test(text[cursor])) {
            explicit = text[cursor];
          }
          cursor++;
        }
        if (native || custom.length > 0) {
          flush();
          combinator = explicit ?? ' ';
        } else if (explicit) {
          combinator = explicit;
        }
        index = cursor - 1;
        continue;
      }
      native += char;
    }
    flush();
    return steps;
  };

  const matchesCustom = (element, pseudo) => {
    switch (pseudo.name) {
      case 'visible':
        return isVisible(element);
      case 'has-text':
        return textMatches(textOf(element), { text: parseText(pseudo.arg).text, exact: false });
      case 'text':
        return textMatches(textOf(element), parseText(pseudo.arg));
      case 'text-is':
        return textOf(element) === normalize(parseText(pseudo.arg).text);
      case 'has':
        return splitTopLevel(pseudo.arg, ',').some((part) => queryCss(part, [element]).length > 0);
      case 'not':
        // A compound may hold custom pseudo-classes (`:not(:has-text("x"))`); a complex argument is the browser's.
        return !splitTopLevel(pseudo.arg, ',').some((part) => {
          const steps = parseComplex(part);
          return steps.length === 1 ? matchesStep(element, steps[0]) : element.matches(part);
        });
      default:
        return false;
    }
  };

  const matchesStep = (element, step) => {
    if (step.native !== '*' && !element.matches(step.native)) {
      return false;
    }
    return step.custom.every((pseudo) => matchesCustom(element, pseudo));
  };

  /** Elements matching one complex selector, searched from each of `roots`. */
  const queryComplex = (source, roots) => {
    let current = roots;
    for (const step of parseComplex(source)) {
      const next = new Set();
      for (const root of current) {
        let candidates;
        switch (step.combinator) {
          case '>':
            candidates = [...root.children];
            break;
          case '+':
            candidates = root.nextElementSibling ? [root.nextElementSibling] : [];
            break;
          case '~': {
            candidates = [];
            for (let sibling = root.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
              candidates.push(sibling);
            }
            break;
          }
          default:
            candidates = root.querySelectorAll(step.native);
        }
        for (const candidate of candidates) {
          if (matchesStep(candidate, step)) {
            next.add(candidate);
          }
        }
      }
      current = [...next];
    }
    return current;
  };

  const queryCss = (source, roots) => {
    const found = new Set();
    for (const part of splitTopLevel(source, ',')) {
      for (const element of queryComplex(part, roots)) {
        found.add(element);
      }
    }
    return [...found];
  };

  /** The deepest elements whose text matches: an ancestor of a match is not a match of its own. */
  const queryText = (raw, roots) => {
    const spec = parseText(raw);
    const found = [];
    for (const root of roots) {
      for (const element of root.querySelectorAll('*')) {
        if (['SCRIPT', 'STYLE', 'HEAD', 'NOSCRIPT'].includes(element.tagName)) {
          continue;
        }
        if (!textMatches(textOf(element), spec)) {
          continue;
        }
        const child = [...element.children].some((inner) => textMatches(textOf(inner), spec));
        if (!child) {
          found.push(element);
        }
      }
    }
    return found;
  };

  const IMPLICIT_ROLES = {
    button: 'button,input[type=button],input[type=submit],input[type=reset],summary',
    link: 'a[href]',
    textbox: 'input:not([type]),input[type=text],input[type=email],input[type=search],input[type=url],textarea',
    checkbox: 'input[type=checkbox]',
    radio: 'input[type=radio]',
    combobox: 'select',
    option: 'option',
    heading: 'h1,h2,h3,h4,h5,h6',
    listitem: 'li',
    list: 'ul,ol',
    dialog: 'dialog',
    img: 'img[alt]',
  };

  const accessibleName = (element) => {
    const label = element.getAttribute('aria-label');
    if (label) {
      return normalize(label);
    }
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      return normalize(
        labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id))
          .filter(Boolean)
          .map(textOf)
          .join(' '),
      );
    }
    if (element.labels?.length) {
      return normalize([...element.labels].map(textOf).join(' '));
    }
    return textOf(element) || normalize(element.getAttribute('title') ?? element.getAttribute('placeholder') ?? '');
  };

  /**
   * Playwright's `role=` skips what assistive technology cannot see — here the native `<select>` a styled combobox
   * keeps hidden behind itself, whose options would otherwise match before the visible ones.
   */
  const isHiddenForAria = (element) => {
    if (element.closest('[aria-hidden="true"], [hidden], [inert]')) {
      return true;
    }
    if (getComputedStyle(element).visibility === 'hidden') {
      return true;
    }
    const owner = element instanceof HTMLOptionElement ? element.closest('select') : undefined;
    return (owner ?? element).getClientRects().length === 0;
  };

  const queryRole = (raw, roots) => {
    const match = /^([a-z]+)(.*)$/s.exec(raw.trim());
    if (!match) {
      throw new Error(`bad role selector: role=${raw}`);
    }
    const [, role, rest] = match;
    const filters = [
      ...rest.matchAll(/\[\s*([a-z-]+)\s*(?:=\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\]\s]+)\s*([si])?)?\s*\]/g),
    ].map(([, name, value, flag]) => ({ name, value: value === undefined ? undefined : parseText(value).text, flag }));
    const css = `[role="${role}"]${IMPLICIT_ROLES[role] ? `,${IMPLICIT_ROLES[role]}` : ''}`;
    return queryCss(css, roots).filter((element) => {
      if (isHiddenForAria(element)) {
        return false;
      }
      const explicit = element.getAttribute('role');
      if (explicit && explicit !== role) {
        return false;
      }
      return filters.every(({ name, value, flag }) => {
        if (name === 'name') {
          const actual = accessibleName(element);
          return flag === 's' ? actual === value : actual.toLowerCase().includes(String(value).toLowerCase());
        }
        const state =
          element.getAttribute(`aria-${name}`) ??
          (name in element ? String(element[name]) : element.getAttribute(name));
        return value === undefined ? state === 'true' || state === '' : state === value;
      });
    });
  };

  const byDocumentOrder = (elements) =>
    [...new Set(elements)].sort((left, right) =>
      left === right ? 0 : left.compareDocumentPosition(right) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    );

  window.__autocueQuery = (selector, scope) => {
    let current = [scope ?? document];
    for (const raw of splitTopLevel(selector, '>>')) {
      const part = raw.trim();
      const engine = /^([a-z-]+)=/.exec(part);
      if (engine?.[1] === 'nth') {
        const index = Number(part.slice(4));
        const picked = index < 0 ? current.at(index) : current[index];
        current = picked ? [picked] : [];
        continue;
      }
      const body = engine ? part.slice(engine[0].length) : part;
      switch (engine?.[1]) {
        case 'text':
          current = queryText(body, current);
          break;
        case 'role':
          current = queryRole(body, current);
          break;
        case 'data-testid':
          current = queryCss(`[data-testid="${parseText(body).text}"]`, current);
          break;
        case 'css':
        case undefined:
          current = queryCss(body, current);
          break;
        default:
          // A `:` or `=` inside plain CSS (`a[href=x]`) never reaches here: the engine name must lead.
          current = queryCss(part, current);
      }
      current = byDocumentOrder(current);
    }
    return current;
  };

  /** Exposed for the locator helpers that filter by text the way the selector pseudo-classes do. */
  window.__autocueText = { textOf, textMatches, isVisible, parseText };
};
