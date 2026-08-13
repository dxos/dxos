//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { CommentCapabilities, ReviewCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const stateAtom = Atom.make<ReviewCapabilities.CommentState>({ toolbar: {}, drafts: {} }).pipe(Atom.keepAlive);

    return [Capability.contribute(CommentCapabilities.State, stateAtom)];
  }),
);
