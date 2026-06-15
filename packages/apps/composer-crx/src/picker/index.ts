//
// Copyright 2026 DXOS.org
//

import { getActionsForUrl } from '../page-actions/registry';
import { type Snapshot } from '../page-actions/types';
import { harvestFavicon, harvestHints, harvestSelection } from './harvest';
import { showPickerNotice } from './notice';
import { startPicker } from './picker';

export * from './picker';
export * from './harvest';

export type PickedSnapshot = {
  actionId: string;
  snapshot: Snapshot;
};

/**
 * Run the picker → harvest flow in the active tab. The toolbar offers the
 * cached picker-context page actions for this URL; the chosen action id and
 * the harvested snapshot are returned for delivery. Returns `null` when the
 * user cancels or no picker actions are registered yet.
 */
export const pickSnapshot = async (): Promise<PickedSnapshot | null> => {
  const actions = await getActionsForUrl(window.location.href, 'picker');
  if (actions.length === 0) {
    showPickerNotice('Open Composer to enable clip actions.');
    return null;
  }

  const result = await startPicker(actions.map(({ id, label, icon }) => ({ id, label, icon })));
  if (result.status !== 'picked') {
    return null;
  }

  const selection = harvestSelection(result.element);
  return {
    actionId: result.actionId,
    snapshot: {
      source: {
        url: window.location.href,
        title: document.title,
        favicon: harvestFavicon(document),
        clippedAt: new Date().toISOString(),
      },
      // An empty-text selection would defeat downstream excerpt fallbacks, so
      // it is omitted entirely (mirrors the popup snapshot extractor's guard).
      selection: selection.text.trim().length > 0 ? selection : undefined,
      hints: harvestHints(document),
    },
  };
};
