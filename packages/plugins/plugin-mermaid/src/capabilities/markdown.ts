//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';

import { mermaid } from '../extensions/index.ts';

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(MarkdownCapabilities.ExtensionProvider, [mermaid])),
);
