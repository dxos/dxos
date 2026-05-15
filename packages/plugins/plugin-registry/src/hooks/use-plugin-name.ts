//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import { useTranslation } from '@dxos/react-ui';

/**
 * Returns a resolver that maps a plugin id to its human-readable display name.
 *
 * Each plugin registers its translations under its own id as the i18n
 * namespace and exposes `plugin.name`; when no translation is registered the
 * resolver falls back to the id itself so callers always get a non-empty
 * string.
 */
export const usePluginName = () => {
  const { t } = useTranslation();
  return useCallback((id: string): string => t('plugin.name', { ns: id, defaultValue: id }), [t]);
};
