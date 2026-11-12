//
// Copyright 2026 DXOS.org
//

//
// Every element kind the studio deck's slides draw, by type. One table, because a story that shows a slide or the
// whole deck otherwise names each kind twice — in its import and in a `Capability.contribute` line — and nine
// slides' worth of kinds does not survive that.
//
// `fat-arrow` is not here: it draws as plain shapes (`placeShapes` in `studio.ts`), which is the point of listing it
// in the deck's component table at all.
//

import { type ElementKindSpec } from '@dxos/react-ui-canvas';

import { appFrameSpec } from './AppFrame.tsx';
import { cardSpec } from './Card.tsx';
import { chipSpec } from './Chip.tsx';
import { feedCardSpec } from './FeedCard.tsx';
import { plankSpec } from './Plank.tsx';
import { spaceGraphSpec } from './SpaceGraph.tsx';
import { substrateSpec } from './Substrate.tsx';

export const STUDIO_KINDS: Readonly<Record<string, ElementKindSpec>> = {
  'card': cardSpec,
  'feed-card': feedCardSpec,
  'chip': chipSpec,
  'plank': plankSpec,
  'app-frame': appFrameSpec,
  'space-graph': spaceGraphSpec,
  'substrate': substrateSpec,
};
