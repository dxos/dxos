//
// Copyright 2026 DXOS.org
//

import { type PausedReason, continueHere } from '../util/paused.ts';

// No client, plugins or React: the page must render while another tab owns the worker.
const REASONS: Record<PausedReason, string> = {
  unresponsive:
    'Another tab holds Composer but stopped responding. Continuing here takes over from it, and that tab pauses.',
  stolen: 'You continued in another tab, so this one paused. Continuing here takes Composer back.',
  superseded:
    'A newer version of Composer opened in another tab, so this one paused. Continuing here loads the newer version.',
  contention: 'Another tab keeps taking Composer over, so this one paused. Continuing here takes it back.',
};

const isReason = (value: string | null): value is PausedReason => value !== null && value in REASONS;

const params = new URLSearchParams(location.search);
const reason = params.get('reason');

const reasonElement = document.getElementById('reason');
if (reasonElement) {
  reasonElement.textContent = isReason(reason) ? REASONS[reason] : 'Composer is open in another tab.';
}

const detail = params.get('detail');
const detailElement = document.getElementById('detail');
if (detail && detailElement) {
  detailElement.textContent = detail;
  detailElement.hidden = false;
}

document.getElementById('continue')?.addEventListener('click', () => continueHere(params.get('from')));
