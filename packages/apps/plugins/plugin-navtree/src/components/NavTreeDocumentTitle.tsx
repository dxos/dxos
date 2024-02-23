//
// Copyright 2023 DXOS.org
//
import { useEffect } from 'react';

import { useTranslation } from '@dxos/react-ui';
import { type TreeNode } from '@dxos/react-ui-navtree';

import { getTreeItemLabel } from '../util';

export const NavTreeDocumentTitle = ({ activeNode }: { activeNode?: TreeNode }) => {
  const { t } = useTranslation();
  useEffect(() => {
    document.title = activeNode ? getTreeItemLabel(activeNode, t) : t('current app name', { ns: 'appkit' });
  }, [activeNode?.label]);
  return null;
};
