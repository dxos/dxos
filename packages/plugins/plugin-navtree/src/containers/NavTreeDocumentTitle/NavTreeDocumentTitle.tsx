//
// Copyright 2023 DXOS.org
//
import { useEffect } from 'react';

import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import { toLocalizedString, useTranslation } from '@dxos/react-ui';
import { osTranslations } from '@dxos/ui-theme';

import { meta } from '#meta';

export const NavTreeDocumentTitle = ({ node }: { node?: AppGraphNode.Node }) => {
  const { t } = useTranslation(meta.profile.key);
  useEffect(() => {
    document.title = node ? toLocalizedString(node.properties.label, t) : t('current-app.name', { ns: osTranslations });
  }, [node?.properties?.label]);
  return null;
};

NavTreeDocumentTitle.displayName = 'NavTreeDocumentTitle';
