//
// Copyright 2026 DXOS.org
//

import type * as Plugin from '@dxos/app-framework/Plugin';
import type * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { type Obj } from '@dxos/echo';

/** The objects a demo's partial seeds, by key; each key a peer can show. */
export type Subjects = Record<string, Obj.Unknown>;

/**
 * One live demo: the content its partial seeds into a shared space, the plugins that render it, and which object
 * each peer shows when the demo opens (one entry opens one-up, two open two-up).
 */
export type Demo<S extends Subjects = Subjects> = {
  readonly id: string;
  readonly title: string;
  readonly partial: SampleSpace.Partial<S>;
  /** Plugins beside the core set, built per peer since plugin instances hold state. */
  readonly plugins: () => Plugin.Plugin[];
  /** The subjects a peer can switch between, with their labels. */
  readonly views: { readonly [K in keyof S & string]?: string };
  readonly layout: readonly [keyof S & string] | readonly [keyof S & string, keyof S & string];
};

export const make = <S extends Subjects>(demo: Demo<S>): Demo<S> => demo;
