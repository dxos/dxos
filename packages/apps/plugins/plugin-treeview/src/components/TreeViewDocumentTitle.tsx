//
// Copyright 2023 DXOS.org
//
import { useEffect } from 'react';

import { type Node } from '@braneframe/plugin-graph';
import { useTranslation } from '@dxos/react-ui';

import { getTreeItemLabel } from '../util';

export const TreeViewDocumentTitle = ({ data: activeNode }: { data: Node }) => {
  const { t } = useTranslation();
  useEffect(() => {
    document.title = activeNode ? getTreeItemLabel(activeNode, t) : t('current app name', { ns: 'appkit' });
  }, [activeNode]);
  return null;
};
