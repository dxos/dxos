//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Obj } from '@dxos/echo';
import { DxAnchorActivate, Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { type TreeNode } from '@dxos/react-ui-graph';
import '@dxos/react-ui-graph/styles/graph.css';

import { Visualization } from '#components';
import { DEFAULT_NEIGHBORHOOD_DEPTH, useNeighborhoodModel } from '#hooks';
import { meta } from '#meta';

/** Selectable traversal depths offered in the companion toolbar. */
const DEPTHS = [1, 2, 3] as const;

export type NeighborhoodCompanionProps = {
  role?: string;
  /** The active node whose neighbourhood is rendered (passed as the companion subject). */
  subject: Obj.Any;
};

/**
 * Companion that renders the n-hop neighbourhood of the active node as an ego-centric radial graph,
 * with the active node at the centre. Depth (number of hops traversed) is adjustable in the toolbar.
 */
export const NeighborhoodCompanion = ({ role = 'article', subject }: NeighborhoodCompanionProps) => {
  const { t } = useTranslation(meta.profile.key);
  const [depth, setDepth] = useState<number>(DEFAULT_NEIGHBORHOOD_DEPTH);
  const model = useNeighborhoodModel(subject, depth);

  const handleDepthChange = useCallback((value: string) => {
    const next = Number.parseInt(value, 10);
    if (Number.isFinite(next)) {
      setDepth(next);
    }
  }, []);

  // Dismiss the preview popover. The dxn/label/trigger fields are placeholders ignored on `state: false`.
  const handleDismiss = useCallback(() => {
    document.defaultView?.dispatchEvent(
      new DxAnchorActivate({ dxn: '', label: '', trigger: document.body, state: false }),
    );
  }, []);

  const handleHover = useCallback((node: TreeNode | null, event?: MouseEvent) => {
    // Pointer left the node/label: keep the popover open so it can be hovered/interacted with.
    if (!node || !event) {
      return;
    }
    const obj = node.data;
    if (!obj || !Obj.isObject(obj)) {
      return;
    }
    const dxn = Obj.getURI(obj);
    if (!dxn) {
      return;
    }

    const target = event.target as HTMLElement;
    target.dispatchEvent(new DxAnchorActivate({ dxn, kind: 'card', trigger: target, label: Obj.getLabel(obj) ?? dxn }));
  }, []);

  if (!subject || !model) {
    return null;
  }

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <div role='none' className='grow' />
          <Toolbar.ToggleGroup type='single' value={String(depth)} onValueChange={handleDepthChange}>
            {DEPTHS.map((value) => (
              <Toolbar.ToggleGroupItem
                key={value}
                value={String(value)}
                aria-label={t('depth.label', { count: value })}
                title={t('depth.label', { count: value })}
              >
                {value}
              </Toolbar.ToggleGroupItem>
            ))}
          </Toolbar.ToggleGroup>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <Visualization.Root
          classNames='bg-base-surface'
          model={model}
          variant='neighborhood'
          focus={subject.id}
          onSurfaceClick={handleDismiss}
        >
          <Visualization.Graph onNodeHover={handleHover} />
        </Visualization.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

NeighborhoodCompanion.displayName = 'NeighborhoodCompanion';
