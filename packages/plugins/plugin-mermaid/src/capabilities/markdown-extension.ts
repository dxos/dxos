//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';

import { mermaid } from '../extensions';

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contributes(MarkdownCapabilities.ExtensionProvider, [mermaid])),
);
