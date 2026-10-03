//
// Copyright 2026 DXOS.org
//

import React from 'react';
import { useTranslation } from 'react-i18next';

import { translationKey } from '#translations';

import { composable, composableProps } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { Icon } from '../Icon/index.ts';

export type EmptyProps = {
  /** A Phosphor icon above the message; decorative, since the message carries the statement. */
  icon?: string;
};

/**
 * Stands in for content that is not there (no items, no selection, no result): a centred status message, its text the
 * children or the translated "No items". Composites build their own `Empty` part on it.
 */
export const Empty = composable<HTMLDivElement, EmptyProps>(({ children, icon, ...props }, forwardedRef) => {
  const { t } = useTranslation(translationKey);
  const { className, ...rest } = composableProps<HTMLDivElement>(props, {
    classNames: recipes.empty(),
    role: 'status',
  });
  return (
    <div {...rest} data-scope='empty' data-part='root' className={className} ref={forwardedRef}>
      {icon && <Icon icon={icon} />}
      <p data-scope='empty' data-part='text'>
        {children ?? t('empty.label')}
      </p>
    </div>
  );
});

Empty.displayName = 'Empty';
