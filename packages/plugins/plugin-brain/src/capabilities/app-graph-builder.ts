//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, TypeSection } from '@dxos/app-toolkit';
import { Topic } from '@dxos/types';

/**
 * Surfaces all `Topic` objects in a space as a dedicated sidebar section — a root node plus a child per
 * `Topic`, each opening via the regular object/article surface (`TopicArticle`). The section's label and
 * icon derive from the `Topic` schema annotations; it is suppressed when the space has no topics.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* TypeSection.createTypeSectionExtension(Topic.Topic);
    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
