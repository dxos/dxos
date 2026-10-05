//
// Copyright 2026 DXOS.org
//

/**
 * Pointer and keyboard input dispatched from inside the page, for a WebDriver whose own actions are too thin to
 * drive Composer. The macOS route (`tauri-plugin-wdio-webdriver`) turns a pointer action into bare
 * `mousedown`/`mouseup`/`click` and a key into a `KeyboardEvent` with no default action, so Radix menus, which
 * open on `pointerdown`, stay shut and CodeMirror takes no text. This sends the sequence a real click or keypress
 * produces, and performs the defaults the browser would: focus on press, text insertion through
 * `execCommand('insertText')` (which CodeMirror and React both observe), deletion, caret movement and Tab
 * navigation. The events are untrusted; Ark, Radix and CodeMirror do not check.
 *
 * Not covered: native HTML5 drag and drop (WebKit starts a drag only from real input), and anything gated on
 * `isTrusted`, such as `requestFullscreen` or clipboard reads.
 */

/**
 * Installed with `executeScript`, idempotent per `version`. Self-contained, since it is serialized into the page.
 * Exposes `window.__autocueInput`.
 */
export const installInput = (version) => {
  if (window.__autocueInput && window.__autocueInputVersion === version) {
    return;
  }
  window.__autocueInputVersion = version;

  const POINTER_ID = 1;
  const BUTTON_BITS = [1, 4, 2];
  const FOCUSABLE =
    'a[href], area[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
    'textarea:not([disabled]), iframe, summary, [tabindex], [contenteditable]:not([contenteditable="false"])';

  const state = {
    x: 0,
    y: 0,
    buttons: 0,
    hovered: null,
    pressed: null,
    // A canceled `pointerdown` suppresses the compatibility mouse events of that press, as in a browser.
    mouseSuppressed: false,
    captured: null,
    // A key whose keydown was canceled has no default on release either (Space on a button).
    canceled: new Set(),
    modifiers: { shiftKey: false, ctrlKey: false, altKey: false, metaKey: false },
  };

  // Synthetic pointers are not active pointers, so a library capturing one would throw; the capture is tracked
  // here instead and routes the press's remaining events.
  const setPointerCapture = Element.prototype.setPointerCapture;
  Element.prototype.setPointerCapture = function (pointerId) {
    try {
      setPointerCapture.call(this, pointerId);
    } catch (error) {
      if (pointerId !== POINTER_ID) {
        throw error;
      }
    }
    if (pointerId === POINTER_ID) {
      state.captured = this;
    }
  };
  const releasePointerCapture = Element.prototype.releasePointerCapture;
  Element.prototype.releasePointerCapture = function (pointerId) {
    if (pointerId === POINTER_ID && state.captured === this) {
      state.captured = null;
    }
    try {
      releasePointerCapture.call(this, pointerId);
    } catch {
      // Never captured natively.
    }
  };
  const hasPointerCapture = Element.prototype.hasPointerCapture;
  Element.prototype.hasPointerCapture = function (pointerId) {
    return (pointerId === POINTER_ID && state.captured === this) || hasPointerCapture.call(this, pointerId);
  };

  const mouseInit = (button, extra = {}) => ({
    bubbles: true,
    cancelable: true,
    composed: true,
    view: window,
    clientX: state.x,
    clientY: state.y,
    screenX: window.screenX + state.x,
    screenY: window.screenY + state.y,
    button,
    buttons: state.buttons,
    ...state.modifiers,
    ...extra,
  });
  const pointerInit = (button, extra = {}) => ({
    ...mouseInit(button, extra),
    pointerId: POINTER_ID,
    pointerType: 'mouse',
    isPrimary: true,
    width: 1,
    height: 1,
    pressure: state.buttons ? 0.5 : 0,
  });
  const pointer = (target, type, button = -1, extra) =>
    target.dispatchEvent(new PointerEvent(type, pointerInit(button, extra)));
  const mouse = (target, type, button = 0, extra) =>
    target.dispatchEvent(new MouseEvent(type, mouseInit(button, extra)));

  const at = () => document.elementFromPoint(state.x, state.y) ?? document.documentElement;

  const chain = (element) => {
    const list = [];
    for (let node = element; node; node = node.parentElement) {
      list.push(node);
    }
    return list;
  };

  /** over/out on the two targets, enter/leave on the ancestors only one of them has, as a pointer crossing does. */
  const hoverTo = (next) => {
    const previous = state.hovered?.isConnected ? state.hovered : null;
    if (previous === next) {
      return;
    }
    const kept = new Set(chain(next));
    if (previous) {
      pointer(previous, 'pointerout', -1, { relatedTarget: next });
      mouse(previous, 'mouseout', 0, { relatedTarget: next });
      for (const node of chain(previous).filter((node) => !kept.has(node))) {
        node.dispatchEvent(
          new PointerEvent('pointerleave', { ...pointerInit(-1), bubbles: false, relatedTarget: next }),
        );
        node.dispatchEvent(new MouseEvent('mouseleave', { ...mouseInit(0), bubbles: false, relatedTarget: next }));
      }
    }
    const left = new Set(previous ? chain(previous) : []);
    pointer(next, 'pointerover', -1, { relatedTarget: previous });
    mouse(next, 'mouseover', 0, { relatedTarget: previous });
    for (const node of chain(next)
      .filter((node) => !left.has(node))
      .toReversed()) {
      node.dispatchEvent(
        new PointerEvent('pointerenter', { ...pointerInit(-1), bubbles: false, relatedTarget: previous }),
      );
      node.dispatchEvent(new MouseEvent('mouseenter', { ...mouseInit(0), bubbles: false, relatedTarget: previous }));
    }
    state.hovered = next;
  };

  const moveOnce = (x, y) => {
    state.x = x;
    state.y = y;
    const target = at();
    hoverTo(target);
    const routed = state.captured?.isConnected ? state.captured : target;
    pointer(routed, 'pointermove');
    if (!state.mouseSuppressed) {
      mouse(routed, 'mousemove', 0);
    }
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /** Moves in `steps` interpolated events over `duration` ms, so hover and drag handlers see the path. */
  const move = async (x, y, { steps = 1, duration = 0 } = {}) => {
    const from = { x: state.x, y: state.y };
    for (let step = 1; step <= steps; step++) {
      moveOnce(from.x + ((x - from.x) * step) / steps, from.y + ((y - from.y) * step) / steps);
      if (duration > 0 && step < steps) {
        await sleep(duration / steps);
      }
    }
  };

  const isEditable = (element) =>
    !!element &&
    (element.isContentEditable ||
      (element instanceof HTMLTextAreaElement && !element.readOnly) ||
      (element instanceof HTMLInputElement &&
        !element.readOnly &&
        !['button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'image', 'range', 'color'].includes(element.type)));

  /** Pressing moves focus to the nearest focusable ancestor, or clears it, as the browser's mousedown default does. */
  const focusAt = (target) => {
    const focusable = target.closest?.(FOCUSABLE);
    if (focusable) {
      if (document.activeElement !== focusable && !focusable.contains(document.activeElement)) {
        focusable.focus({ preventScroll: true });
      }
      // A press in text puts the caret there; CodeMirror sets its own on mousedown, so this only reaches the rest.
      if (focusable.isContentEditable && !focusable.closest('.cm-editor')) {
        const range = document.caretRangeFromPoint?.(state.x, state.y);
        if (range) {
          const selection = getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    } else if (document.activeElement && document.activeElement !== document.body) {
      document.activeElement.blur();
    }
  };

  const down = (button = 0) => {
    const target = at();
    hoverTo(target);
    state.buttons |= BUTTON_BITS[button] ?? 1;
    state.pressed = target;
    state.mouseSuppressed = !pointer(target, 'pointerdown', button);
    if (!state.mouseSuppressed) {
      const proceed = mouse(target, 'mousedown', button, { detail: 1 });
      if (proceed) {
        focusAt(target);
      }
      // macOS opens the context menu on press.
      if (button === 2) {
        mouse(target, 'contextmenu', 2, { detail: 1 });
      }
    }
  };

  const up = (button = 0) => {
    const target = state.captured?.isConnected ? state.captured : at();
    state.buttons &= ~(BUTTON_BITS[button] ?? 1);
    pointer(target, 'pointerup', button);
    if (!state.mouseSuppressed) {
      mouse(target, 'mouseup', button, { detail: 1 });
    }
    const pressed = state.pressed?.isConnected ? state.pressed : null;
    if (button === 0 && pressed) {
      // The click goes to the nearest element both the press and the release were inside.
      const shared = chain(target).find((node) => node.contains(pressed));
      if (shared) {
        shared.dispatchEvent(new PointerEvent('click', pointerInit(0, { detail: 1 })));
      }
    }
    if (state.captured) {
      const captured = state.captured;
      state.captured = null;
      captured.dispatchEvent(new PointerEvent('lostpointercapture', pointerInit(-1)));
    }
    state.pressed = null;
    state.mouseSuppressed = false;
  };

  const NAMED = {
    Backspace: ['Backspace', 8],
    Tab: ['Tab', 9],
    Enter: ['Enter', 13],
    Shift: ['ShiftLeft', 16],
    Control: ['ControlLeft', 17],
    Alt: ['AltLeft', 18],
    Meta: ['MetaLeft', 91],
    Escape: ['Escape', 27],
    PageUp: ['PageUp', 33],
    PageDown: ['PageDown', 34],
    End: ['End', 35],
    Home: ['Home', 36],
    ArrowLeft: ['ArrowLeft', 37],
    ArrowUp: ['ArrowUp', 38],
    ArrowRight: ['ArrowRight', 39],
    ArrowDown: ['ArrowDown', 40],
    Insert: ['Insert', 45],
    Delete: ['Delete', 46],
    ...Object.fromEntries(Array.from({ length: 12 }, (_, index) => [`F${index + 1}`, [`F${index + 1}`, 112 + index]])),
  };
  const PUNCTUATION = {
    ' ': ['Space', 32],
    '-': ['Minus', 189],
    '=': ['Equal', 187],
    '[': ['BracketLeft', 219],
    ']': ['BracketRight', 221],
    '\\': ['Backslash', 220],
    ';': ['Semicolon', 186],
    "'": ['Quote', 222],
    ',': ['Comma', 188],
    '.': ['Period', 190],
    '/': ['Slash', 191],
    '`': ['Backquote', 192],
  };
  const MODIFIER = { Shift: 'shiftKey', Control: 'ctrlKey', Alt: 'altKey', Meta: 'metaKey' };

  /** A Playwright key name (`Enter`, `KeyK`, `Digit1`, `Space`, `a`) as `key`, `code` and `keyCode`. */
  const describe = (name) => {
    if (name === 'Space') {
      name = ' ';
    }
    if (NAMED[name]) {
      const [code, keyCode] = NAMED[name];
      return { key: name, code, keyCode };
    }
    const named = /^(?:Key([A-Z])|Digit([0-9]))$/.exec(name);
    if (named) {
      const char = named[1] ?? named[2];
      return {
        key: named[1] && !state.modifiers.shiftKey ? char.toLowerCase() : char,
        code: name,
        keyCode: char.charCodeAt(0),
      };
    }
    if ([...name].length === 1) {
      if (/^[a-z]$/i.test(name)) {
        return { key: name, code: `Key${name.toUpperCase()}`, keyCode: name.toUpperCase().charCodeAt(0) };
      }
      if (/^[0-9]$/.test(name)) {
        return { key: name, code: `Digit${name}`, keyCode: name.charCodeAt(0) };
      }
      const [code, keyCode] = PUNCTUATION[name] ?? ['', name.charCodeAt(0)];
      return { key: name, code, keyCode };
    }
    throw new Error(`unsupported key: ${name}`);
  };

  const focused = () => {
    let element = document.activeElement ?? document.body;
    while (element?.shadowRoot?.activeElement) {
      element = element.shadowRoot.activeElement;
    }
    return element ?? document.body;
  };

  const keyboard = (target, type, { key, code, keyCode }) =>
    target.dispatchEvent(
      new KeyboardEvent(type, {
        key,
        code,
        keyCode,
        which: keyCode,
        location: /Left$/.test(code) ? 1 : 0,
        bubbles: true,
        cancelable: true,
        composed: true,
        view: window,
        ...state.modifiers,
      }),
    );

  const insert = (text) => {
    const target = focused();
    if (isEditable(target)) {
      document.execCommand('insertText', false, text);
    }
  };

  const tabbable = () =>
    [...document.querySelectorAll(FOCUSABLE)].filter((element) => {
      if (element.tabIndex < 0 || element.closest('[inert]')) {
        return false;
      }
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== 'hidden';
    });

  /** What the browser does for a keydown nobody canceled. */
  const keyDefault = (info, target) => {
    const { shiftKey, ctrlKey, altKey, metaKey } = state.modifiers;
    const command = ctrlKey || metaKey;
    const editable = isEditable(target);
    const inField = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
    const selection = getSelection();
    switch (info.key) {
      case 'Enter':
        if (target instanceof HTMLTextAreaElement) {
          insert('\n');
        } else if (target instanceof HTMLInputElement) {
          target.form?.requestSubmit();
        } else if (target.isContentEditable) {
          document.execCommand(shiftKey ? 'insertLineBreak' : 'insertParagraph');
        } else if (target instanceof HTMLButtonElement || (target instanceof HTMLAnchorElement && target.href)) {
          target.click();
        }
        return;
      case 'Backspace':
      case 'Delete':
        if (editable) {
          document.execCommand(info.key === 'Backspace' ? 'delete' : 'forwardDelete');
        }
        return;
      case 'Tab': {
        const list = tabbable();
        const index = list.indexOf(target);
        const next = list.at(shiftKey ? (index <= 0 ? -1 : index - 1) : (index + 1) % list.length);
        next?.focus();
        return;
      }
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'ArrowUp':
      case 'ArrowDown':
      case 'Home':
      case 'End': {
        if (!editable) {
          return;
        }
        const forward = ['ArrowRight', 'ArrowDown', 'End'].includes(info.key);
        if (inField && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(info.key)) {
          const end = target.value.length;
          const position = ['Home', 'End'].includes(info.key)
            ? forward
              ? end
              : 0
            : Math.max(0, Math.min(end, (forward ? target.selectionEnd : target.selectionStart) + (forward ? 1 : -1)));
          target.setSelectionRange(position, position);
        } else {
          const granularity = ['Home', 'End'].includes(info.key)
            ? 'lineboundary'
            : ['ArrowUp', 'ArrowDown'].includes(info.key)
              ? 'line'
              : altKey
                ? 'word'
                : 'character';
          selection.modify(shiftKey ? 'extend' : 'move', forward ? 'forward' : 'backward', granularity);
        }
        return;
      }
      default:
        if (command && info.key.toLowerCase() === 'a') {
          if (inField) {
            target.select();
          } else {
            document.execCommand('selectAll');
          }
          return;
        }
        if (!command && [...info.key].length === 1) {
          keyboard(target, 'keypress', { ...info, keyCode: info.key.charCodeAt(0) });
          insert(info.key);
        }
    }
  };

  const keyDown = (name) => {
    const info = describe(name);
    if (MODIFIER[name]) {
      state.modifiers[MODIFIER[name]] = true;
    }
    const target = focused();
    if (keyboard(target, 'keydown', info)) {
      state.canceled.delete(info.key);
      keyDefault(info, target);
    } else {
      state.canceled.add(info.key);
    }
  };

  const keyUp = (name) => {
    const info = describe(name);
    const target = focused();
    const proceed = keyboard(target, 'keyup', info) && !state.canceled.has(info.key);
    state.canceled.delete(info.key);
    if (MODIFIER[name]) {
      state.modifiers[MODIFIER[name]] = false;
    }
    // Space activates a button on release.
    if (proceed && info.key === ' ' && target instanceof HTMLButtonElement) {
      target.click();
    }
  };

  /** Holds `names` in order and releases them in reverse: a chord such as `['Meta', 'k']`. */
  const press = (names) => {
    for (const name of names) {
      keyDown(name);
    }
    for (const name of names.toReversed()) {
      keyUp(name);
    }
  };

  /** Types `text` key by key; a newline is Enter and a tab is Tab, as Playwright types them. */
  const type = async (text, delay = 0) => {
    for (const char of text) {
      const name = char === '\n' ? 'Enter' : char === '\t' ? 'Tab' : char;
      keyDown(name);
      keyUp(name);
      if (delay > 0) {
        await sleep(delay);
      }
    }
  };

  window.__autocueInput = {
    move,
    down,
    up,
    press,
    type,
    keyDown,
    keyUp,
    get position() {
      return { x: state.x, y: state.y };
    },
  };
};
