//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Obj, Type } from '@dxos/echo';
import { VersioningCapabilities } from '@dxos/plugin-versioning';

import { Markdown } from '#types';

const activate = Effect.fnUntraced(function* () {
  const provider: VersioningCapabilities.HistoryProvider = {
    id: Type.getTypename(Markdown.Document),
    getTarget: (object) => (Obj.instanceOf(Markdown.Document, object) ? object.content.target : undefined),
  };
  return Capability.contributes(VersioningCapabilities.HistoryProvider, provider);
});

export default activate;
