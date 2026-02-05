//
// Copyright 2023 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { type MaybePromise } from '@dxos/util';

// TODO(burdon): Replace with hotkeys-js, react-hotkeys, and react-hotkeys-hook.

export type KeyHandler = (props: {
  context: string;
  shortcut: string;
  data?: any;
  event: KeyboardEvent;
}) => MaybePromise<boolean | void>;

export type KeyBinding = {
  shortcut: string;
  handler: KeyHandler;
  disableInput?: boolean;
  data?: any;
};

// Keybinding is normalized to this order.
// https://support.apple.com/en-us/HT201236
const modifiers = ['ctrl', 'shift', 'alt', 'meta'];

// Normalize order and case of modifiers.
export const parseShortcut = (shortcut: string, delimiter = /[+-]/): string => {
  const parts = shortcut.toLowerCase().split(delimiter);
  const mods = modifiers.filter((key) => parts.includes(key));
  invariant(mods.length === 0 || mods.length === parts.length - 1);
  // Assume single natural key.
  return mods.length ? [...mods, parts[parts.length - 1]].join('+') : shortcut;
};

class KeyboardContext {
  readonly _keyMap = new Map<string, KeyBinding>();

  get bindings() {
    return Array.from(this._keyMap.values());
  }

  get(binding: string): KeyBinding | undefined {
    return this._keyMap.get(binding);
  }

  bind(config: KeyBinding): void {
    config.shortcut = parseShortcut(config.shortcut);
    this._keyMap.set(config.shortcut, config);
  }

  unbind(binding: string): void {
    this._keyMap.delete(binding);
  }
}

const ROOT = '';

/**
 * Manages context-aware key bindings.
 */
export class Keyboard {
  static singleton = new Keyboard();

  private readonly _root = new KeyboardContext();
  private readonly _keyMap = new Map<string, KeyboardContext>([[ROOT, this._root]]);
  private readonly _contexts: string[] = [ROOT];
  private readonly _keyHandler = this.handleKeyDown.bind(this);
  private _path = ROOT;

  initialize(): void {
    document.addEventListener('keydown', this._keyHandler);
  }

  destroy(): void {
    document.removeEventListener('keydown', this._keyHandler);
  }

  bind = this._root.bind.bind(this._root);
  unbind = this._root.unbind.bind(this._root);

  setCurrentContext(path = ROOT): void {
    this._path = path;
  }

  getCurrentContext(): string {
    return this._path;
  }

  getContext(path = ROOT): KeyboardContext {
    let context = this._keyMap.get(path);
    if (!context) {
      context = new KeyboardContext();
      this._keyMap.set(path, context);
      this._contexts.push(path);
      this._contexts.sort();
    }

    return context;
  }

  getBindings(): KeyBinding[] {
    const bindings = new Map<string, KeyBinding>();
    for (let i = 0; i < this._contexts.length; ++i) {
      const path = this._contexts[i];
      if (this._path.startsWith(path)) {
        this.getContext(path).bindings.forEach((binding) => {
          bindings.set(binding.shortcut, binding);
        });
      }
    }

    return Array.from(bindings.values());
  }

  async handleKeyDown(event: KeyboardEvent): Promise<void> {
    const { altKey, ctrlKey, metaKey, shiftKey, key } = event;

    if (key !== 'Alt' && key !== 'Control' && key !== 'Meta' && key !== 'Shift') {
      // Binding option to check for input or contenteditable.
      const tagName = (event.target as any)?.tagName;
      const isInput =
        tagName === 'INPUT' || tagName === 'TEXTAREA' || (event.target as any)?.getAttribute('contenteditable');

      // Normalized key binding (order matters, see note above).
      const str = [ctrlKey && 'ctrl', shiftKey && 'shift', altKey && 'alt', metaKey && 'meta', key]
        .filter(Boolean)
        .join('+');

      // Scan matching contexts.
      for (let i = this._contexts.length - 1; i >= 0; --i) {
        const path = this._contexts[i];
        if (this._path.startsWith(path)) {
          const { data, handler, disableInput } = this.getContext(path).get(str) ?? {};
          if (handler && (!isInput || !disableInput)) {
            const result = await handler({ context: path, shortcut: str, data, event });
            if (result !== false) {
              // TODO(burdon): This doesn't prevent actions in markdown editor.
              //  Reference: https://codemirror.net/docs/ref/#view.KeyBinding
              event.preventDefault();
              event.stopPropagation();
            }

            return;
          }
        }
      }
    }
  }
}
