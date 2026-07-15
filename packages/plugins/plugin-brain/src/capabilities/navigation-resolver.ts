//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, TypeSection } from '@dxos/app-toolkit';
import { Topic } from '@dxos/types';

/**
 * Resolves `root/<spaceId>/<topic-typename>/<objectId>` paths (deep links / reloads into the Topics
 * section) to the topic's EID, so navigating to a topic child node doesn't 404.
 */
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      AppCapabilities.NavigationPathResolver,
      TypeSection.createTypeSectionPathResolver(Topic.Topic),
    ),
  ),
);
