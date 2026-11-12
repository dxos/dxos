//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { diagramPreview } from '@dxos/diagram/extension';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';

/** A `diagram` fence in a markdown document draws as the canvas would draw it, in the editor's colour mode. */
export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(MarkdownCapabilities.ExtensionProvider, [() => diagramPreview()])),
);
