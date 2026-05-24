//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useCapabilities } from '@dxos/app-framework/ui';
import { getSpace } from '@dxos/react-client/echo';
import { type Message } from '@dxos/types';

import { InboxCapabilities, InboxOperation } from '../../types';

export type ExtractorMenuItem = {
  id: string;
  label: string;
  onSelect: () => void;
};

/**
 * Returns menu items for each registered MessageExtractor that matches the given message.
 * Clicking an item invokes the ExtractMessage operation with that extractor's id.
 */
export const useExtractorActions = (message: Message.Message): ExtractorMenuItem[] => {
  const extractors = useCapabilities(InboxCapabilities.MessageExtractor);
  // Use the plural form so this hook is safe in contexts without a registered operation invoker (e.g. isolated stories).
  const [invoker] = useCapabilities(Capabilities.OperationInvoker);

  return useMemo(() => {
    if (!invoker) {
      return [];
    }

    return extractors
      .filter((extractor) => extractor.match(message).matched)
      .map((extractor) => ({
        id: extractor.id,
        label: extractor.description,
        onSelect: () => {
          const space = getSpace(message);
          if (!space) {
            return;
          }

          void invoker.invokePromise(InboxOperation.ExtractMessage, {
            db: space.db,
            message,
            extractorId: extractor.id,
          });
        },
      }));
  }, [extractors, invoker, message]);
};
