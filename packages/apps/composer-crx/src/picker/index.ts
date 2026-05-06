//
// Copyright 2026 DXOS.org
//

import { runClipPipeline } from '../clip/pipeline';
import { type Clip } from '../clip/types';
import { harvestFavicon, harvestHints, harvestSelection } from './harvest';
import { startPicker } from './picker';

export * from './picker';
export * from './harvest';

/**
 * Run the full picker → harvest → pipeline flow in the active tab.
 * Returns the finished Clip, or `null` if the user cancels.
 */
export const pickAndHarvest = async (): Promise<Clip | null> => {
  const result = await startPicker();
  if (result.status !== 'picked') {
    return null;
  }

  const selection = harvestSelection(result.element);
  const hints = harvestHints(document);
  const favicon = harvestFavicon(document);

  const clip: Clip = {
    version: 1,
    kind: result.kind,
    source: {
      url: window.location.href,
      title: document.title,
      favicon,
      clippedAt: new Date().toISOString(),
    },
    selection,
    hints,
  };

  return runClipPipeline(clip);
};
