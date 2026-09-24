//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { CommentCapabilities, ReviewCapabilities } from '#types';

export const CommentState = Capability.makeModule(
  'CommentState',
  // Headless: comments sync in a markdown document with no review surface ever rendered, so gating
  // this on the review UI's start is wrong. Ungated (hence idle) it is also pullable by the
  // consumers that need it earlier, which a start-gated provider is not.
  { provides: [CommentCapabilities.State] },
  Effect.fnUntraced(function* () {
    const stateAtom = Atom.make<ReviewCapabilities.CommentState>({ toolbar: {}, drafts: {} }).pipe(Atom.keepAlive);

    return [Capability.contribute(CommentCapabilities.State, stateAtom)];
  }),
);
