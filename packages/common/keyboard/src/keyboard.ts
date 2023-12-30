//
// Copyright 2023 DXOS.org
//

import { invariant } from '@dxos/invariant';

export type KeyHandler = (props: {
  context: string;
  binding: string;
  data?: any;
  event: KeyboardEvent;
}) => boolean | void;

export type KeyBinding = {
  binding: string;
  handler: KeyHandler;
  disableInput?: boolean;
  data?: any;
};

const modifiers = ['alt', 'ctrl', 'shift', 'meta'];

class KeyboardContext {
  readonly _keyMap = new Map<string, KeyBinding>();

  get bindings() {
    return Array.from(this._keyMap.values());
  }

  get(binding: string) {
    return this._keyMap.get(binding);
  }

  bind(config: KeyBinding) {
    // Normalize order of modifiers.
    const { binding } = config;
    const parts = binding.split('+');
    const mods = parts.filter((key) => modifiers.includes(key)).sort();
    invariant(mods.length === 0 || mods.length === parts.length - 1);
    if (mods.length) {
      config.binding = [...mods, parts[parts.length - 1]].join('+');
    }

    // console.log('bind', config);
    this._keyMap.set(config.binding, config);
  }

  unbind(binding: string) {
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

  initialize() {
    document.addEventListener('keydown', this._keyHandler);
  }

  destroy() {
    document.removeEventListener('keydown', this._keyHandler);
  }

  bind = this._root.bind.bind(this._root);
  unbind = this._root.unbind.bind(this._root);

  setCurrentContext(path = ROOT) {
    this._path = path;
  }

  getCurrentContext() {
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

  getBindings() {
    const bindings = new Map<string, KeyBinding>();
    for (let i = 0; i < this._contexts.length; ++i) {
      const path = this._contexts[i];
      if (this._path.startsWith(path)) {
        this.getContext(path).bindings.forEach((binding) => {
          bindings.set(binding.binding, binding);
        });
      }
    }

    return Array.from(bindings.values());
  }

  handleKeyDown(event: KeyboardEvent) {
    const { altKey, ctrlKey, metaKey, shiftKey, key } = event;

    if (key !== 'Alt' && key !== 'Control' && key !== 'Meta' && key !== 'Shift') {
      // Binding option to check for input or contenteditable.
      const tagName = (event.target as any)?.tagName;
      const isInput =
        tagName === 'INPUT' || tagName === 'TEXTAREA' || (event.target as any)?.getAttribute('contenteditable');

      // Normalized key binding.
      const str = [altKey && 'alt', ctrlKey && 'ctrl', shiftKey && 'shift', metaKey && 'meta', key]
        .filter(Boolean)
        .join('+');

      // Scan matching contexts.
      for (let i = this._contexts.length - 1; i >= 0; --i) {
        const path = this._contexts[i];
        if (this._path.startsWith(path)) {
          const { data, handler, disableInput } = this.getContext(path).get(str) ?? {};
          // console.log('>>>', path, str, handler);
          if (handler && (!isInput || !disableInput)) {
            const result = handler({ context: path, binding: str, data, event });
            if (result !== false) {
              // TODO(burdon): Doesn't prevent actions in markdown editor.
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
