//
// Copyright 2026 DXOS.org
//

import { useEffect } from 'react';

import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as UrlPath from '@dxos/app-toolkit/UrlPath';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Theme from '@dxos/react-ui/Theme';

import { meta } from '#meta';

/**
 * Keep the address bar's `title` parameter naming the attended node, so a link copied from the address
 * bar previews with a name in messengers. Replaces rather than pushes: a title is not a navigation.
 */
export const useUrlTitle = (node: AppGraphNode.Node | undefined) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const title = node?.properties.label ? Theme.toLocalizedString(node.properties.label, t) : undefined;
  useEffect(() => {
    const current = new URL(window.location.href);
    const next = UrlPath.withTitle(current, title);
    if (next.href !== current.href) {
      window.history.replaceState(window.history.state, '', next);
    }
  }, [title]);
};
