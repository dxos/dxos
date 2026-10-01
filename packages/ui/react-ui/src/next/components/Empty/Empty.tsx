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
  /** A glyph above the text. */
  icon?: string;
};

/**
 * The empty state of a collection: an optional icon over its text (the children) in the description colour; without
 * children it says "No items". Composites declare their own `Empty` part on it, rendered only when they have no items.
 */
export const Empty = composable<HTMLDivElement, EmptyProps>(({ icon, children, ...props }, forwardedRef) => {
  const { t } = useTranslation(translationKey);
  const { className, ...rest } = composableProps(props, { classNames: recipes.empty() });
  return (
    <div {...rest} role='status' data-scope='empty' data-part='root' className={className} ref={forwardedRef}>
      {icon && <Icon icon={icon} />}
      <p data-scope='empty' data-part='text' className={recipes.emptyText()}>
        {children ?? t('empty.label')}
      </p>
    </div>
  );
});

Empty.displayName = 'Next.Empty';
