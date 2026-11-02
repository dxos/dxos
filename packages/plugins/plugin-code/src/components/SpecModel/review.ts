//
// Copyright 2026 DXOS.org
//

import { type VerdictStatus } from '@dxos/deus/review';
import type * as Tag from '@dxos/react-ui/Tag';

export const STATUS_STYLE: Record<VerdictStatus, { icon: string; hue: Tag.TagHue; label: string }> = {
  done: { icon: 'ph--check-circle--regular', hue: 'success', label: 'Done' },
  untested: { icon: 'ph--question--regular', hue: 'info', label: 'Untested' },
  partial: { icon: 'ph--circle-half--regular', hue: 'warning', label: 'Partial' },
  diverged: { icon: 'ph--git-diff--regular', hue: 'orange', label: 'Diverged' },
  missing: { icon: 'ph--x-circle--regular', hue: 'error', label: 'Missing' },
};
