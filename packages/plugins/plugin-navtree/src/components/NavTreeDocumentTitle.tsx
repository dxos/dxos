//
// Copyright 2023 DXOS.org
//
import { useEffect } from 'react';

import { type Node } from '@dxos/app-graph';
import { toLocalizedString, useTranslation } from '@dxos/react-ui';
import { osTranslations } from '@dxos/ui-theme';

import { meta } from '../meta';

export const NavTreeDocumentTitle = ({ node }: { node?: Node.Node }) => {
  const { t } = useTranslation(meta.id);
  useEffect(() => {
    document.title = node ? toLocalizedString(node.properties.label, t) : t('current app name', { ns: osTranslations });
  }, [node?.properties?.label]);
  return null;
};
