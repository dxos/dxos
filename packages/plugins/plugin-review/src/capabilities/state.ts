//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { Atom } from 'effect/unstable/reactivity';

import * as Capability from '@dxos/app-framework/Capability';

import * as CommentCapabilities from '../types/CommentCapabilities';
import * as ReviewCapabilities from '../types/ReviewCapabilities';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const stateAtom = Atom.make<ReviewCapabilities.CommentState>({ toolbar: {}, drafts: {} }).pipe(Atom.keepAlive);

    return [Capability.contribute(CommentCapabilities.State, stateAtom)];
  }),
);
