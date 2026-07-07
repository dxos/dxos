//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';
import browser from 'webextension-polyfill';

import { log } from '@dxos/log';
import { IconButton } from '@dxos/react-ui';

import {
  PAGE_ACTION_PREDICATE_MESSAGE_TYPE,
  PAGE_ACTION_RUN_MESSAGE_TYPE,
  type PageActionDescriptor,
  decodeInvokeAck,
  getActionsForUrl,
} from '../../core';

type ActionState = 'idle' | 'pending' | 'ok' | 'error';

/**
 * User-facing hints for the stable ack error codes; unknown codes fall back to
 * the raw code so new failures stay diagnosable.
 */
const ERROR_HINTS: Record<string, string> = {
  tabUnavailable: 'cannot reach this page — reload the tab and try again',
  extractorFailed: 'could not read the page',
  timeout: 'Composer did not respond',
  noSpace: 'open a space in Composer first',
  disabled: 'extension actions are disabled in Composer settings',
  unknownAction: 'action not recognized — update Composer or the extension',
};

/**
 * Whether a content-script predicate response reports a DOM match. The
 * response crosses an extension messaging boundary, so it is narrowed
 * structurally rather than trusted.
 */
const isPredicateMatch = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && 'matches' in value && value.matches === true;

export type PageActionsProps = {
  tabId: number;
  tabUrl: string;
};

/**
 * Toolbar row of page actions applicable to the current tab. Stays open
 * while an invocation is pending and reports the outcome inline.
 */
export const PageActions = ({ tabId, tabUrl }: PageActionsProps) => {
  const [actions, setActions] = useState<PageActionDescriptor[]>([]);
  const [states, setStates] = useState<Record<string, ActionState>>({});
  const [message, setMessage] = useState<string | null>(null);

  // Filter cached actions by URL, then by lazy DOM predicate on the tab.
  useEffect(() => {
    let cancelled = false;
    // Clear stale state up-front so actions from a previous tab context are
    // not interactive while the async predicate filtering is in flight.
    setActions([]);
    setStates({});
    setMessage(null);
    void (async () => {
      const candidates = await getActionsForUrl(tabUrl, 'popup');
      const visible: PageActionDescriptor[] = [];
      for (const action of candidates) {
        if (action.predicate) {
          try {
            const result: unknown = await browser.tabs.sendMessage(tabId, {
              type: PAGE_ACTION_PREDICATE_MESSAGE_TYPE,
              exists: action.predicate.exists,
            });
            if (!isPredicateMatch(result)) {
              continue;
            }
          } catch {
            continue;
          }
        }
        visible.push(action);
      }
      if (!cancelled) {
        setActions(visible);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tabId, tabUrl]);

  const handleRun = useCallback(
    async (action: PageActionDescriptor) => {
      setStates((current) => ({ ...current, [action.id]: 'pending' }));
      setMessage(null);
      try {
        const response: unknown = await browser.runtime.sendMessage({
          type: PAGE_ACTION_RUN_MESSAGE_TYPE,
          actionId: action.id,
          tabId,
        });
        const ack = decodeInvokeAck(response);
        const ok = ack?.ok === true;
        setStates((current) => ({ ...current, [action.id]: ok ? 'ok' : 'error' }));
        const error = ack && !ack.ok ? (ERROR_HINTS[ack.error] ?? ack.error) : 'failed';
        setMessage(ok ? `${action.label}: done` : `${action.label}: ${error}`);
      } catch (err) {
        log.catch(err);
        setStates((current) => ({ ...current, [action.id]: 'error' }));
        setMessage(`${action.label}: failed`);
      }
    },
    [tabId],
  );

  if (actions.length === 0) {
    return null;
  }

  // Toolbar-embeddable: ghost icon-only buttons matching the chat toolbar's
  // clip button, with a compact inline status. No wrapper chrome of its own so
  // it never displaces the surrounding UI.
  return (
    <>
      {actions.map((action) => (
        <IconButton
          key={action.id}
          variant='ghost'
          iconOnly
          disabled={states[action.id] === 'pending'}
          icon={action.icon}
          iconClassNames={states[action.id] === 'pending' ? 'animate-pulse' : undefined}
          label={action.label}
          onClick={() => handleRun(action)}
        />
      ))}
      {message && (
        <span role='status' aria-live='polite' className='self-center px-1 text-xs text-description truncate'>
          {message}
        </span>
      )}
    </>
  );
};
