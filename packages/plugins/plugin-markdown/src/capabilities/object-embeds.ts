//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { MarkdownCapabilities } from '#types';

import { objectEmbeds } from '../extensions/object-embeds.tsx';

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(MarkdownCapabilities.ObjectEmbeds, objectEmbeds)),
);
