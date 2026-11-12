//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as UiHooks from '@dxos/react-ui/Hooks';

import { BookmarksNamespace } from '../../app-framework-tutorial/src/namespace.ts';

// #region read
export const PluginTitle = () => {
  // Strings resolve in the plugin's namespace; the app picks the language.
  const { t } = UiHooks.useTranslation(BookmarksNamespace.key);
  return <h2>{t('plugin.name')}</h2>;
};
// #endregion

// #region count
export const BookmarkCount = ({ count }: { count: number }) => {
  const { t } = UiHooks.useTranslation('com.example.type.bookmark');
  // `count` picks `typename.label_zero`, `_one` or `_other`.
  return <span>{`${count} ${t('typename.label', { count })}`}</span>;
};
// #endregion
