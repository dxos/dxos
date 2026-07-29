//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { type Capabilities } from '@dxos/app-framework';
import { Obj, Ref } from '@dxos/echo';
import { type ObjectExtractor } from '@dxos/extractor';
import { log } from '@dxos/log';

import { isAiServiceUnavailable } from '../operations/extractor/ai-gate';
import { InboxOperation, type Mailbox } from '../types';

export type MailboxExtractorMenuItem = {
  id: string;
  label: string;
  onSelect: () => void;
};

/**
 * Returns a menu item per registered {@link InboxCapabilities.ObjectExtractor}. Selecting one
 * invokes {@link InboxOperation.ExtractMailbox} over the mailbox feed with default concurrency.
 *
 * `extractors` and `invoker` are resolved by the container (this hook lives under `components/`, which
 * must not call capability hooks) — see the `MailboxArticle` wiring.
 */
export const useMailboxExtractorActions = (
  mailbox: Mailbox.Mailbox,
  extractors: readonly ObjectExtractor[] = [],
  invoker?: Capabilities.OperationInvoker,
): MailboxExtractorMenuItem[] => {
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
