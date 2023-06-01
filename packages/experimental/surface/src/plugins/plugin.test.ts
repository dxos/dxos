//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { FC } from 'react';

import { describe, test } from '@dxos/test';

// eslint-disable-next-line unused-imports/no-unused-vars
export interface Interface<T> {
  key: string;
}

type InterfaceDef<T> = {
  key: Interface<T>;
  impl: T;
};

export const provide = <T>(key: Interface<T>, impl: T): InterfaceDef<T> => ({ key, impl });

export type PluginProps = {
  provides?: InterfaceDef<any>[];
};

export class Plugin {
  readonly _interfaces = new Map<string, any>();
  constructor({ provides }: PluginProps) {
    provides?.forEach(({ key, impl }) => this._interfaces.set(key.key, impl));
  }

  getInterface = <T>(key: Interface<T>): T | undefined => this._interfaces.get(key.key);
}

const getInterfaces = <T>(plugins: Plugin[], key: Interface<T>): T[] =>
  plugins.map((plugin) => plugin.getInterface(key)).filter(Boolean) as any;

//
// Interfaces allow shared typesafe contracts between plugins.
// The system might define common contracts (e.g., Printable); others would be defined by individual plugins.
// This allows parts of the system to find interfaces across all plugins to enable loosely coupled actions
// (separate from broadcast events) or requests for information.
//

export interface Printable {
  print: (data: any | undefined) => void;
}

export const Printable: Interface<Printable> = { key: 'printable' };

export interface Selectable {
  selection: () => string | undefined;
  select: (object?: { id: string | undefined }) => void;
}

export const Selectable: Interface<Selectable> = { key: 'selectable' };

// NOTE: Would allow Stack to define a contract for plugins that have embeddable content.
export type Section = FC<{ object: any; onSelect: (object: string | undefined) => void }>;

export const Section: Interface<Section> = { key: 'list' };

//
// Plugin defs
//
// TODO(burdon): Tie to declarative manifest.
// {
//   Printable: { print: (data: any) => console.log(data) }
// }
//

const plugin1 = new Plugin({
  provides: [
    provide(Printable, {
      print: (data: any | undefined) => console.log(data),
    }),

    provide(Selectable, {
      selection: () => undefined,
      select: (data: any) => {}, // TODO(burdon): Update plugin state.
    }),

    // provide(Section, ({ object }) => <div>{JSON.stringify(object)}</div>),
  ],
});

const plugin2 = new Plugin({
  provides: [
    provide(Printable, {
      print: (data: any) => console.log(data),
    }),
  ],
});

const plugin3 = new Plugin({});

describe('Test plugins', () => {
  const plugins = [plugin1, plugin2, plugin3];

  test('test invocation', () => {
    // Invoke against all plugins that provide interface.
    expect(getInterfaces(plugins, Printable)).to.have.length(2);
    getInterfaces(plugins, Printable).forEach((i) => i.print({}));
  });

  test('test symbols', () => {
    const s1 = Symbol.for('s1');
    const s2 = Symbol.for('s1');
    expect(s1).to.be.eq(s2);

    const map = new Map();
    map.set(s1, true);
    map.set(s2, false);
    expect(map.get(s1)).to.be.false;
  });
});

// eslint-disable-next-line unused-imports/no-unused-vars
// const StackContainer: FC<{}> = () => {
//   const StackSection = plugin1.getInterface(Section)!;
//   const selected = plugin1.getInterface(Selectable)?.selection();

//   return (
//     <StackSection object={selected} onSelect={(object) => plugin1.getInterface(Selectable)?.select({ id: object })} />
//   );
// };
