//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Type } from '@dxos/echo';

import { Markdown } from '#types';

import { getMarkdownAnchorText } from '../model/selection';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(AppCapabilities.AnchorResolver, {
      key: Type.getTypename(Markdown.Document),
      getText: getMarkdownAnchorText,
    }),
  ),
);
