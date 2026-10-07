//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Type } from '@dxos/echo';

import { Markdown } from '#types';

import { getMarkdownAnchorText } from '../model/selection.ts';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(AppCapabilities.AnchorResolver, {
      key: Type.getTypename(Markdown.Document),
      getText: getMarkdownAnchorText,
    }),
  ),
);
