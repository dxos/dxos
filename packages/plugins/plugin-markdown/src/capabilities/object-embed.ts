//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { PreviewComponent } from '#components';
import { MarkdownCapabilities } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(MarkdownCapabilities.ObjectEmbed, PreviewComponent)),
);
