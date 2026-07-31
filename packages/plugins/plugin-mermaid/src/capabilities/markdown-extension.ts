//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';

import { mermaid } from '../extensions';

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(MarkdownCapabilities.ExtensionProvider, [mermaid])),
);
