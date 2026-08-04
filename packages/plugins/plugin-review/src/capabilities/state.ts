//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { CommentCapabilities } from '#types';

import * as ReviewCapabilities from '../types/ReviewCapabilities';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const stateAtom = Atom.make<ReviewCapabilities.CommentState>({ toolbar: {}, drafts: {} }).pipe(Atom.keepAlive);

    return [Capability.contribute(CommentCapabilities.State, stateAtom)];
  }),
);
