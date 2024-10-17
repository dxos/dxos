//
// Copyright 2023 DXOS.org
//
import { useEffect } from 'react';

import { type Node } from '@dxos/app-graph';
import { toLocalizedString, useTranslation } from '@dxos/react-ui';

import { NAVTREE_PLUGIN } from '../meta';

export const NavTreeDocumentTitle = ({ node }: { node?: Node }) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);
  useEffect(() => {
    document.title = node ? toLocalizedString(node.properties.label, t) : t('current app name', { ns: 'appkit' });
  }, [node?.properties?.label]);
  return null;
};
