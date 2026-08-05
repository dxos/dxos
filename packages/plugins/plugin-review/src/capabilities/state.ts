//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';

import { CommentCapabilities, type CommentState } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const stateAtom = Atom.make<CommentState>({ toolbar: {}, drafts: {} }).pipe(Atom.keepAlive);

    return [Capability.contribute(CommentCapabilities.State, stateAtom)];
  }),
);
