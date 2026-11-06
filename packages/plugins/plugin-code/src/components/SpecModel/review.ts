//
// Copyright 2026 DXOS.org
//

import { type VerdictStatus } from '@dxos/deus/review';
import type * as Tag from '@dxos/react-ui/Tag';

/** Each status's icon, tag hue, label, and the text colour of its icon, matching the review gutter. */
export const STATUS_STYLE: Record<VerdictStatus, { icon: string; hue: Tag.TagHue; label: string; text: string }> = {
  done: { icon: 'ph--check-circle--regular', hue: 'success', label: 'Done', text: 'text-success-text' },
  untested: { icon: 'ph--question--regular', hue: 'info', label: 'Untested', text: 'text-info-text' },
  partial: { icon: 'ph--circle-half--regular', hue: 'warning', label: 'Partial', text: 'text-warning-text' },
  diverged: { icon: 'ph--git-diff--regular', hue: 'orange', label: 'Diverged', text: 'text-orange-text' },
  missing: { icon: 'ph--x-circle--regular', hue: 'error', label: 'Missing', text: 'text-error-text' },
};
