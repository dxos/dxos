//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode } from 'react';

import { Icon, composable, composableProps, useTranslation } from '@dxos/react-ui';
import { osTranslations } from '@dxos/ui-theme';
import { type ComposableProps } from '@dxos/ui-types';

export type EmptyProps = ComposableProps<{
  /** Message to show; caller is responsible for translating it. Falls back to a generic message when omitted. */
  label?: ReactNode;
  /** Optional Phosphor icon name shown above the message. */
  icon?: string;
}>;

/**
 * Empty-state placeholder for a list/collection: a subdued, centered message shown in place of the list
 * when there are no items. Pass a domain-specific {@link EmptyProps.label} (already translated); when none is
 * given it falls back to a generic "No items" message from the shared `os` translation namespace.
 */
export const Empty = composable<HTMLDivElement, EmptyProps>(({ label, icon, ...props }, forwardedRef) => {
  const { t } = useTranslation(osTranslations);
  // `defaultValue` keeps the fallback working even before a host registers the key, and leaves it translatable.
  const message = label ?? t('empty.label', { defaultValue: 'No items' });
  return (
    <div
      {...composableProps<HTMLDivElement>(props, {
        classNames: 'flex flex-col items-center justify-center gap-2 p-4 text-sm text-center text-description',
        role: 'status',
      })}
      ref={forwardedRef}
    >
      {icon && <Icon icon={icon} size={6} classNames='text-subdued' />}
      <span>{message}</span>
    </div>
  );
});

Empty.displayName = 'Empty';
