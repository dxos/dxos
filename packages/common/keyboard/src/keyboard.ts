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
  data?: any;
};

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
    const mods = parts.filter((key) => ['alt', 'ctrl', 'meta', 'shift'].includes(key)).sort();
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
  private readonly _keyHandler = this._onKeyDown.bind(this);
  private _path = ROOT;

  initialize() {
    document.addEventListener('keydown', this._keyHandler);
  }

  destroy() {
    document.removeEventListener('keydown', this._keyHandler);
  }

  bind = this._root.bind.bind(this._root);
  unbind = this._root.unbind.bind(this._root);

  setContext(path = ROOT) {
    this._path = path;
  }

  getBindings() {
    const bindings: { [key: string]: any } = {};
    for (let i = 0; i < this._contexts.length; ++i) {
      const path = this._contexts[i];
      if (this._path.startsWith(path)) {
        this.getContext(path).bindings.forEach((binding) => {
          bindings[binding.binding] = binding.data ?? true;
        });
      }
    }

    return bindings;
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

  _onKeyDown(event: KeyboardEvent) {
    const { altKey, ctrlKey, metaKey, shiftKey, key } = event;

    if (key !== 'Alt' && key !== 'Control' && key !== 'Meta' && key !== 'Shift') {
      // TODO(burdon): Option to call anywhere.
      // TODO(burdon): Check for contenteditable.
      // const tagName = (event.target as any)?.tagName;
      // if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
      //   return;
      // }

      const str = [altKey && 'alt', ctrlKey && 'ctrl', metaKey && 'meta', shiftKey && 'shift', key]
        .filter(Boolean)
        .join('+');

      console.log(str);

      // Scan matching contexts.
      for (let i = 0; i < this._contexts.length; ++i) {
        const path = this._contexts[i];
        if (this._path.startsWith(path)) {
          const { data, handler } = this.getContext(path).get(str) ?? {};
          // console.log('>>>', path, str, handler);
          if (handler) {
            const result = handler({ context: path, binding: str, data, event });
            if (result !== false) {
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
