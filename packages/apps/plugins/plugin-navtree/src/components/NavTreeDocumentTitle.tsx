//
// Copyright 2023 DXOS.org
//
import { useEffect } from 'react';

import { toLocalizedString, useTranslation } from '@dxos/react-ui';
import { type TreeNode } from '@dxos/react-ui-navtree';

export const NavTreeDocumentTitle = ({ activeNode }: { activeNode?: TreeNode }) => {
  const { t } = useTranslation();
  useEffect(() => {
    document.title = activeNode ? toLocalizedString(activeNode.label, t) : t('current app name', { ns: 'appkit' });
  }, [activeNode?.label]);
  return null;
};
