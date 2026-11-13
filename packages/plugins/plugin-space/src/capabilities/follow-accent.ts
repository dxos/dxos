//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';

import { SpaceCapabilities } from '#types';

import { FOLLOW_HUE, takesPartInFollow } from '../util/presence.ts';

/** Every plank heading takes the follow's hue while this session follows or is followed in the space the deck shows. */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const ephemeralAtom = yield* SpaceCapabilities.EphemeralState;
    const layoutAtom = yield* AppCapabilities.Layout;
    const accentAtom = Atom.make((get): string | undefined => {
      const { following, followedSpaces } = get(ephemeralAtom);
      const spaceId = GraphPath.getSpaceIdFromPath(get(layoutAtom).workspace);
      return spaceId && takesPartInFollow(spaceId, following, followedSpaces) ? FOLLOW_HUE : undefined;
    });
    return Capability.contribute(AppCapabilities.HeadingAccent, accentAtom);
  }),
);
