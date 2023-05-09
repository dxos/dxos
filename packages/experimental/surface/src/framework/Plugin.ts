//
// Copyright 2023 DXOS.org
//

import { FC } from 'react';

import { Action, NullAction } from './Action';

export interface PluginConfig<TState extends {} = {}, TAction extends Action = typeof NullAction> {
  id: string;
  // TODO(burdon): Named components?
  components: Record<string, FC>;
  initialState?: TState;
  reducer?: (state: TState, action: TAction) => TState;
}

export abstract class Plugin<TState extends {} = {}, TAction extends Action = typeof NullAction> {
  protected constructor(public readonly config: PluginConfig<TState, TAction>) {}

  getComponent(context: any): FC | undefined {
    return undefined;
  }
}

// Capabilities.

/*
class PluginBase {
  private caps = new Map<string, any>();

  getCapability<T>(def: Cap<T>): T | undefined {
    this.caps.get(def.id);
  }

  protected provideCapability<T>(def: Cap<T>, cap: T) {
    this.caps.set(def.id, cap);
  }
}

const defineCapability = <T,>(id: string): Cap<T> => ({ id });
interface Cap<T> {
  id: string;
}

///

interface Focusable {
  focus(): void;
}
const Focusable = defineCapability < FC<{ item: any }>('focusable');

interface Selectable {
  select(): void;
  Component: FC<{ item: any }>;
}
const Selectable = defineCapability<Selectable>('selectable');

class List extends PluginBase {
  constructor() {
    super();
    this.provideCapability(Focusable, {
      focus: () => {}
    });
  }
}

class List2 extends PluginBase {
  constructor() {
    super();
    this.provideCapability(Selectable, {
      select: () => {}
    });
  }
}

const plugin: PluginBase = new List();

const f = plugin.getCapability(Focusable);

f?.focus();
*/
