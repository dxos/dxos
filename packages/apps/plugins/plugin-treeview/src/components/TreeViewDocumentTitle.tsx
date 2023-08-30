//
// Copyright 2023 DXOS.org
//
import { useEffect } from 'react';

import { useTranslation } from '@dxos/aurora';

import { useTreeView } from '../TreeViewContext';
import { getTreeItemLabel } from '../util';

export const TreeViewDocumentTitle = () => {
  const { activeNode } = useTreeView();
  const { t } = useTranslation();
  useEffect(() => {
    document.title = activeNode ? getTreeItemLabel(activeNode, t) : t('current app name', { ns: 'appkit' });
  }, [activeNode]);
  return null;
};
