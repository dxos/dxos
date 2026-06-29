//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useCapabilities } from '@dxos/app-framework/ui';
import { Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';

import { isAiServiceUnavailable } from '../../operations/extractor/ai-gate';
import { InboxCapabilities, InboxOperation, type Mailbox } from '../../types';

export type MailboxExtractorMenuItem = {
  id: string;
  label: string;
  onSelect: () => void;
};

/**
 * Returns a menu item per registered {@link InboxCapabilities.ObjectExtractor}. Selecting one
 * invokes {@link InboxOperation.ExtractMailbox} over the mailbox feed with default concurrency.
 */
export const useMailboxExtractorActions = (mailbox: Mailbox.Mailbox): MailboxExtractorMenuItem[] => {
  const extractors = useCapabilities(InboxCapabilities.ObjectExtractor);
  const [invoker] = useCapabilities(Capabilities.OperationInvoker);

  return useMemo(() => {
    if (!invoker) {
      return [];
    }

    const db = Obj.getDatabase(mailbox);
    if (!db) {
      return [];
    }

    return extractors.map((extractor) => ({
      id: extractor.id,
      label: extractor.title,
      onSelect: () => {
        void invoker
          .invokePromise(
            InboxOperation.ExtractMailbox,
            { mailbox: Ref.make(mailbox), extractorId: extractor.id },
            { spaceId: db.spaceId },
          )
          .then((result) => {
            if (result.error) {
              if (isAiServiceUnavailable(result.error)) {
                log.warn('extract mailbox skipped: AI service not ready — try again once the assistant has loaded', {
                  extractorId: extractor.id,
                });
              } else {
                log.warn('extract mailbox failed', { err: result.error, extractorId: extractor.id });
              }
              return;
            }
            log.info('extract mailbox complete', { extractorId: extractor.id, ...result.data });
          });
      },
    }));
  }, [extractors, invoker, mailbox]);
};
