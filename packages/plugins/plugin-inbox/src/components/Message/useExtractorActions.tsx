//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useCapabilities } from '@dxos/app-framework/ui';
import { log } from '@dxos/log';
import { getSpace } from '@dxos/react-client/echo';
import { type Message } from '@dxos/types';

import { isAiServiceUnavailable } from '../../operations/extractor/ai-gate';
import { InboxCapabilities, InboxOperation } from '../../types';

export type ExtractorMenuItem = {
  id: string;
  label: string;
  onSelect: () => void;
};

const RUN_ALL_ID = 'run-all';

/**
 * Returns a menu item for every registered `ObjectExtractor` applicable to the message's source
 * type (no `match()` filtering — see below). Clicking an item invokes the `ExtractMessage`
 * operation with that extractor's id. When two or more extractors are listed, a synthetic
 * "Run all" item is prepended that invokes every extractor in parallel and logs aggregated results.
 */
export const useExtractorActions = (message: Message.Message): ExtractorMenuItem[] => {
  const extractors = useCapabilities(InboxCapabilities.ObjectExtractor);
  // Use the plural form so this hook is safe in contexts without a registered operation invoker (e.g. isolated stories).
  const [invoker] = useCapabilities(Capabilities.OperationInvoker);

  return useMemo(() => {
    if (!invoker) {
      return [];
    }

    // The menu lists EVERY registered extractor — no filtering. `match()` is a heuristic used
    // only for auto-selection / auto-on-arrival; gating the menu on it (or on source type) hid the
    // action for senders/subjects the heuristic didn't recognise (e.g. Omio, Expedia). The user
    // picks explicitly and the dispatcher runs the chosen extractor.
    const matching = extractors;

    const runOne = (extractorId: string) => {
      const space = getSpace(message);
      if (!space) {
        return Promise.resolve();
      }
      // NOTE: `spaceId` scopes the spawned operation process so its space-affinity services
      // (e.g. `AiService`) can materialize.
      return invoker
        .invokePromise(InboxOperation.ExtractMessage, { source: message, extractorId }, { spaceId: space.id })
        .catch((err) => {
          // Distinguish the startup race where the assistant plugin's `AiService` LayerSpec is not
          // yet in the process-manager runtime: surface an actionable message instead of an opaque
          // failure. Retrying once the assistant has loaded resolves it.
          if (isAiServiceUnavailable(err)) {
            log.warn('extract message skipped: AI service not ready — try again once the assistant has loaded', {
              extractorId,
            });
          } else {
            log.warn('extract message failed', { err, extractorId });
          }
        });
    };

    const perExtractor: ExtractorMenuItem[] = matching.map((extractor) => ({
      id: extractor.id,
      label: extractor.title,
      onSelect: () => {
        void runOne(extractor.id);
      },
    }));

    if (matching.length < 2) {
      return perExtractor;
    }

    const runAll: ExtractorMenuItem = {
      id: RUN_ALL_ID,
      label: `Run all (${matching.length})`,
      onSelect: () => {
        void Promise.all(matching.map((extractor) => runOne(extractor.id))).then((results) => {
          log.info('extract message: run all complete', {
            total: matching.length,
            ids: matching.map((extractor) => extractor.id),
            results,
          });
        });
      },
    };

    return [runAll, ...perExtractor];
  }, [extractors, invoker, message]);
};
