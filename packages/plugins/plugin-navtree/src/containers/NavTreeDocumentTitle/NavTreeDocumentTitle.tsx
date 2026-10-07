//
// Copyright 2023 DXOS.org
//
import { useEffect } from 'react';

import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Theme from '@dxos/react-ui/Theme';
import { osTranslations } from '@dxos/ui-theme';

import { meta } from '#meta';

export const NavTreeDocumentTitle = ({ node }: { node?: AppGraphNode.Node }) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  useEffect(() => {
    document.title = node
      ? Theme.toLocalizedString(node.properties.label, t)
      : t('current-app.name', { ns: osTranslations });
  }, [node?.properties?.label]);
  return null;
};

NavTreeDocumentTitle.displayName = 'NavTreeDocumentTitle';
