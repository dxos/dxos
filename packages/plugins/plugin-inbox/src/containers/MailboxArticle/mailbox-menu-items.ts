//
// Copyright 2026 DXOS.org
//

import { type Capabilities } from '@dxos/app-framework';
import { Obj, Ref } from '@dxos/echo';
import { type ObjectExtractor } from '@dxos/extractor';
import { log } from '@dxos/log';

import { isAiServiceUnavailable } from '../../operations/extractor/ai-gate';
import { type InboxCapabilities, InboxOperation, type Mailbox } from '../../types';

export type MailboxExtractorMenuItem = {
  id: string;
  label: string;
  onSelect: () => void;
};

/**
 * Returns a menu item per registered {@link InboxCapabilities.ObjectExtractor}. Selecting one
 * invokes {@link InboxOperation.ExtractMailbox} over the mailbox feed with default concurrency.
 *
 * Pure mapping (no hooks) so the mailbox controller can call it inside its menu atom computation;
 * `extractors` and `invoker` are resolved by the caller.
 */
export const getMailboxExtractorActions = (
  mailbox: Mailbox.Mailbox,
  extractors: readonly ObjectExtractor[] = [],
  invoker?: Capabilities.OperationInvoker,
): MailboxExtractorMenuItem[] => {
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
};

/**
 * Returns a menu item per injected {@link InboxCapabilities.MailboxAction}. Selecting one invokes the
 * contributed operation over the mailbox, scoped to its space — the injection path other plugins use
 * to add mailbox toolbar actions (e.g. plugin-brain's `Analyze`) without depending on the toolbar.
 *
 * Pure mapping (no hooks) so the mailbox controller can call it inside its menu atom computation;
 * `actions` and `invoker` are resolved by the caller.
 */
export const getInjectedMailboxActions = (
  mailbox: Mailbox.Mailbox,
  actions: readonly InboxCapabilities.MailboxAction[] = [],
  invoker?: Capabilities.OperationInvoker,
): MailboxExtractorMenuItem[] => {
  if (!invoker) {
    return [];
  }

  const db = Obj.getDatabase(mailbox);
  if (!db) {
    return [];
  }

  return actions.map((action) => ({
    id: action.id,
    label: action.label,
    onSelect: () => {
      const { operation, input } = action.createInvocation(mailbox);
      void invoker
        .invokePromise(operation, input, { spaceId: db.spaceId })
        .then((result) => {
          if (result.error) {
            log.warn('mailbox action failed', { id: action.id, err: result.error });
            return;
          }
          log.info('mailbox action complete', { id: action.id });
        })
        .catch((err) => log.warn('mailbox action failed', { id: action.id, err }));
    },
  }));
};
