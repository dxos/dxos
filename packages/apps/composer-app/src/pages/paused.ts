//
// Copyright 2026 DXOS.org
//

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

const facts: Array<[string, string | undefined]> = [
  ['Reason', reason?.label ?? 'Composer is open in another tab'],
  ['This version', formatVersion(params.get(PausedParam.VERSION))],
  ['Other version', formatVersion(params.get(PausedParam.OTHER_VERSION))],
];

const factsElement = document.getElementById('facts');
for (const [term, value] of facts) {
  if (value && factsElement) {
    const dt = document.createElement('dt');
    dt.textContent = term;
    const dd = document.createElement('dd');
    dd.textContent = value;
    factsElement.append(dt, dd);
  }
}

const explanationElement = document.getElementById('explanation');
if (explanationElement && reason) {
  explanationElement.textContent = reason.explanation;
}

document.getElementById('continue')?.addEventListener('click', () => continueHere(params.get(PausedParam.FROM)));
