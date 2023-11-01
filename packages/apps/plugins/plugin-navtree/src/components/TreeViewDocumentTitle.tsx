//
// Copyright 2023 DXOS.org
//
import { useEffect } from 'react';

import { type Node } from '@dxos/app-graph';
import { useTranslation } from '@dxos/react-ui';

import { getTreeItemLabel } from '../util';

export const TreeViewDocumentTitle = ({ activeNode }: { activeNode?: Node }) => {
  const { t } = useTranslation();
  useEffect(() => {
    document.title = activeNode ? getTreeItemLabel(activeNode, t) : t('current app name', { ns: 'appkit' });
  }, [activeNode?.label]);
  return null;
};
