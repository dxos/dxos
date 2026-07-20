//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Obj, Type } from '@dxos/echo';
import { SpaceCapabilities } from '@dxos/plugin-space';
// Explicit import so the emitted `.d.ts` references the package via its public alias
// instead of a relative `node_modules` path (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { Text } from '@dxos/schema';

import { Markdown } from '#types';

const activate = Effect.fnUntraced(function* () {
  const provider: SpaceCapabilities.HistoryProvider = {
    id: Type.getTypename(Markdown.Document),
    getTarget: (object) => (Obj.instanceOf(Markdown.Document, object) ? object.content.target : undefined),
  };
  return [Capability.provide(SpaceCapabilities.HistoryProvider, provider)];
});

export default activate;
