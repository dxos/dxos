//
// Copyright 2026 DXOS.org
//

import type {} from '@dxos/app-framework/App';

import { PausedParam, type PausedReason, continueHere } from '../util/paused.ts';

// No client, plugins or React: the page must render while another tab owns the worker.
const REASONS: Record<PausedReason, { label: string; explanation: string }> = {
  unresponsive: {
    label: 'Take over from an unresponsive tab',
    explanation: 'Another tab holds Composer but stopped responding. Continuing here takes over from it.',
  },
  stolen: {
    label: 'Taken over by another tab',
    explanation: 'You continued in another tab, so this one paused. Continuing here takes Composer back.',
  },
  superseded: {
    label: 'Different versions open',
    explanation: 'A newer version of Composer opened in another tab. Continuing here loads the newer version.',
  },
  contention: {
    label: 'Tabs keep taking over from each other',
    explanation: 'Another tab keeps taking Composer over. Continuing here takes it back.',
  },
};

const isReason = (value: string | null): value is PausedReason => value !== null && value in REASONS;

/** A build time as a readable date, or nothing for a missing or malformed one. */
const formatVersion = (value: string | null): string | undefined => {
  const time = Number(value);
  return value && Number.isFinite(time) ? new Date(time).toLocaleString() : undefined;
};

const params = new URLSearchParams(location.search);
const reasonParam = params.get(PausedParam.REASON);
const reason = isReason(reasonParam) ? REASONS[reasonParam] : undefined;

const action = { label: 'Continue here', onClick: () => continueHere(params.get(PausedParam.FROM)) };

// The boot loader, stopped: the same mark, surface and button as every load, so the page reads as the
// app pausing rather than as a different screen.
window.__bootLoader?.paused?.({
  title: 'Another instance of the app is open',
  action,
  details: [
    { term: 'Reason', value: reason?.label ?? 'Composer is open in another tab' },
    { term: 'This version', value: formatVersion(params.get(PausedParam.VERSION)) },
    { term: 'Other version', value: formatVersion(params.get(PausedParam.OTHER_VERSION)) },
  ],
  note: reason?.explanation,
});
