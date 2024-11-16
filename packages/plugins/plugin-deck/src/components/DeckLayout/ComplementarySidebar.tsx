//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import {
  type LayoutCoordinate,
  NavigationAction,
  SLUG_PATH_SEPARATOR,
  Surface,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { useGraph } from '@dxos/plugin-graph';
import { Main } from '@dxos/react-ui';
import { useAttended } from '@dxos/react-ui-attention';
import { railGridHorizontal, StackContext } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';

import { NodePlankHeading } from './NodePlankHeading';
import { PlankContentError } from './PlankError';
import { PlankLoading } from './PlankLoading';
import { useNode, useNodeActionExpander } from '../../hooks';
import { type Panel } from '../../types';
import { useLayout } from '../LayoutContext';

export type ComplementarySidebarProps = {
  panels: Panel[];
  current?: string;
};

export const ComplementarySidebar = ({ panels, current }: ComplementarySidebarProps) => {
  const { popoverAnchorId } = useLayout();
  const attended = useAttended();
  const panel = (panels.find((p) => p.id === current) ?? panels[0])?.id;
  const id = attended[0] ? `${attended[0]}${SLUG_PATH_SEPARATOR}${panel}` : undefined;
  const { graph } = useGraph();
  const node = useNode(graph, id);
  const dispatch = useIntentDispatcher();
  useNodeActionExpander(node);

  const actions = useMemo(
    () =>
      panels.map(({ id, label, icon }) => ({
        id: `complementary-${id}`,
        data: () => {
          void dispatch({ action: NavigationAction.OPEN, data: { activeParts: { complementary: id } } });
        },
        properties: {
          label,
          icon,
          menuItemType: 'toggle',
          isChecked: panel === id,
        },
      })),
    [panel],
  );

  // TODO(wittjosiah): Ensure that id is always defined.
  const coordinate: LayoutCoordinate = useMemo(() => ({ entryId: id ?? 'unknown', part: 'complementary' }), [id]);

  // TODO(burdon): Debug panel doesn't change when switching even though id has chagned.
  return (
    <Main.ComplementarySidebar>
      <StackContext.Provider value={{ size: 'contain', orientation: 'horizontal', separators: true, rail: true }}>
        <div role='none' className={mx(railGridHorizontal, 'grid-cols-1 bs-full divide-y divide-separator')}>
          <NodePlankHeading coordinate={coordinate} node={node} popoverAnchorId={popoverAnchorId} actions={actions} />
          <div className='divide-y divide-separator overflow-x-hidden overflow-y-scroll'>
            {node && (
              <Surface
                key={id}
                role={`complementary--${panel}`}
                limit={1}
                data={{ id, subject: node.properties.object ?? node.properties.space, popoverAnchorId }}
                fallback={PlankContentError}
                placeholder={<PlankLoading />}
              />
            )}
          </div>
        </div>
      </StackContext.Provider>
    </Main.ComplementarySidebar>
  );
};
