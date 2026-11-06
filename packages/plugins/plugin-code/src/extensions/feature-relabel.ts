//
// Copyright 2026 DXOS.org
//

import { type Extension, Transaction } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { log } from '@dxos/log';

import { type Feature, FeatureMap, SpecText } from '#types';

/**
 * For a feature's name field: once a local edit settles, the embeds of the feature in its spec's text take the new
 * name as their label. Only the peer that renamed it writes, so two peers never rewrite the same label at once.
 */
export const featureRelabel = (feature: Feature.Feature, { delay = 300 }: { delay?: number } = {}): Extension => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const flush = () => {
    timeout = undefined;
    const spec = FeatureMap.getContainer(feature);
    if (spec) {
      void SpecText.relabel(spec, feature).catch((error) => log.warn('feature relabel failed', { error }));
    }
  };

  return EditorView.updateListener.of((update) => {
    if (update.transactions.some((tr) => tr.docChanged && tr.annotation(Transaction.userEvent) !== undefined)) {
      clearTimeout(timeout);
      timeout = setTimeout(flush, delay);
    }
  });
};
