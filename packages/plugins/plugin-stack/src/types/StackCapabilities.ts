//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Capability from '@dxos/app-framework/Capability';
import type * as Hooks from '@dxos/react-ui/Hooks';

import { StackNamespace } from '../namespace.ts';

/** The height each section last rendered at this session, which it reserves while its content arrives. */
export const SectionHeights = Capability.makeSingleton<Hooks.HeightMemory>()(
  `${StackNamespace.key}.capability.sectionHeights`,
);
