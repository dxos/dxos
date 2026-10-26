//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import { Obj } from '@dxos/echo';
import * as Presentation from '@dxos/plugin-presenter/Presentation';

import { meta } from '#meta';

import { RECORDINGS_COMPANION } from '../constants.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Takes sit beside what they voice, as a companion: a slide's own takes, or the presentation's voice-over.
    const extensions = yield* AppGraphBuilder.createExtension({
      id: 'recordings',
      relation: AppNode.companion,
      match: (node) =>
        Obj.instanceOf(Presentation.Presentation, node.data) || Obj.instanceOf(Presentation.Slide, node.data)
          ? Option.some(node.data)
          : Option.none(),
      connector: () =>
        Effect.succeed([
          AppNode.makeCompanion({
            variant: RECORDINGS_COMPANION,
            label: ['recordings.label', { ns: meta.profile.key }],
            icon: 'ph--record--regular',
            data: RECORDINGS_COMPANION,
          }),
        ]),
    });

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
