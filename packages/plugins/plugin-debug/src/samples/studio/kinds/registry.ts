//
// Copyright 2026 DXOS.org
//

//
// Every element kind the studio deck's slides draw, by type. One table, because the plugin's capability and a story
// that shows a slide otherwise each name every kind. The space graph is not here: it is plugin-canvas's own kind.
//

import { type ElementKindSpec } from '@dxos/react-ui-canvas';

import { appFrameSpec } from './AppFrame.tsx';
import { appChromeSpec, appEmbedSpec, appLinesSpec, appPaneSpec } from './AppParts.tsx';
import { cardSpec } from './Card.tsx';
import { chipSpec } from './Chip.tsx';
import { feedCardSpec } from './FeedCard.tsx';
import { plankSpec } from './Plank.tsx';

export const STUDIO_KINDS: Readonly<Record<string, ElementKindSpec>> = {
  'card': cardSpec,
  'feed-card': feedCardSpec,
  'chip': chipSpec,
  'plank': plankSpec,
  'app-frame': appFrameSpec,
  // The same window taken apart, so a wire ends on the pane it supplies.
  'app-chrome': appChromeSpec,
  'app-pane': appPaneSpec,
  'app-embed': appEmbedSpec,
  'app-lines': appLinesSpec,
};
