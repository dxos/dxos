//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { IconButton, useTranslation } from '@dxos/react-ui';
import { type XmlWidgetProps } from '@dxos/ui-editor';

import { meta } from '#meta';

import { type MessageThreadContext } from '../sync';

// Kept out of `BranchWidget.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

/**
 * Relative ("5 min ago", "yesterday") within two days, absolute date beyond that. The exact
 * timestamp is always available via the `title` tooltip.
 *
 * Recent prompts are the ones a reader places by elapsed time; older ones by date.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

export const formatTime = (created: string, now = Date.now()): string => {
  const date = new Date(created);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const elapsed = now - date.getTime();
  if (elapsed < 0 || elapsed >= 2 * DAY_MS) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  const format = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const minutes = Math.round(elapsed / 60_000);
  if (minutes < 1) {
    // Seconds rather than `format(0, 'minute')`, which renders as "this minute".
    return format.format(-Math.max(1, Math.round(elapsed / 1000)), 'second');
  }
  if (minutes < 60) {
    return format.format(-minutes, 'minute');
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return format.format(-hours, 'hour');
  }

  // `numeric: 'auto'` renders -1 day as "yesterday".
  return format.format(-Math.round(hours / 24), 'day');
};
