//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as Operation from '@dxos/compute/Operation';
import { Filter, Ref } from '@dxos/echo';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';

import { FeedOperation, Magazine } from '#types';

import * as AiBriefingSpace from '../samples/ai-briefing/AiBriefingSpace.ts';

/** Templates whose magazines start empty and are filled by one curation run once the space exists. */
const CURATED_TEMPLATES = new Set([AiBriefingSpace.TEMPLATE_ID]);

/** Schedules {@link FeedOperation.CurateMagazine}, which syncs the feeds first, for each magazine. */
const onCreateSpace: SpaceCapabilities.OnCreateSpace = ({ space }) =>
  Effect.gen(function* () {
    const templateId = AppSpace.getSpaceTemplateId(space);
    if (!templateId || !CURATED_TEMPLATES.has(templateId)) {
      return;
    }

    const magazines = yield* Effect.promise(() => space.db.query(Filter.type(Magazine.Magazine)).run());
    for (const magazine of magazines) {
      yield* Operation.schedule(FeedOperation.CurateMagazine, { magazine: Ref.make(magazine) }, { spaceId: space.id });
    }
  });

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(SpaceCapabilities.OnCreateSpace, onCreateSpace)),
);
