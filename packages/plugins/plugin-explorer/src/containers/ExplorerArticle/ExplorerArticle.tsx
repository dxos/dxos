//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { type Filter, Obj, type View } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { useObject } from '@dxos/react-client/echo';
import { DxAnchorActivate, Icon, Panel, Toolbar } from '@dxos/react-ui';
import { QueryEditor, type QueryEditorProps } from '@dxos/react-ui-components';
// Side-effect import: Visualization drives `SVG.Graph` directly. Without the CSS the
// `g.dx-edge path` rules — including `fill: none` — never reach the bundle and SVG
// defaults (stroke: none, fill: black) make every edge invisible.
import '@dxos/react-ui-graph/styles/graph.css';

import { type TreeNode } from '#components';
import { useGraphModel } from '#hooks';

import { type ExplorerArticleVariant, VARIANTS, isVariant } from './variants';
import { Visualization } from './Visualization';

export type { ExplorerArticleVariant } from './variants';

export type ExplorerArticleProps = AppSurface.ObjectArticleProps<View.View>;

/**
 * Thin wrapper: owns the query editor, the variant toggle, and the DxAnchor preview
 * dispatch. The actual rendering — SVG projector swaps and the swarm canvas — lives in
 * `Visualization`.
 */
export const ExplorerArticle = ({ role, subject, variant }: ExplorerArticleProps) => {
  const [view] = useObject(subject);
  const [filter, setFilter] = useState<Filter.Any>();

  const db = view && Obj.getDatabase(view);
  const model = useGraphModel(db, filter);

  const builder = useMemo(() => new QueryBuilder(), []);
  const handleChange = useCallback<NonNullable<QueryEditorProps['onChange']>>(
    (value) => {
      setFilter(builder.build(value).filter);
    },
    [builder],
  );

  const [selected, setSelected] = useState<ExplorerArticleVariant>(isVariant(variant) ? variant : 'force');
  useEffect(() => {
    if (isVariant(variant)) {
      setSelected(variant);
    }
  }, [variant]);

  const handleVariantChange = useCallback((value: string) => {
    if (isVariant(value)) {
      setSelected(value);
    }
  }, []);

  const handleHover = useCallback((node: TreeNode | null, event?: MouseEvent) => {
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
    target.dispatchEvent(
      new DxAnchorActivate({
        dxn,
        kind: 'card',
        trigger: target,
        label: Obj.getLabel(obj) ?? dxn,
      }),
    );
  }, []);

  const showToolbar = role === 'article';

  if (!db || !model) {
    return null;
  }

  return (
    <Panel.Root role={role}>
      {showToolbar && (
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <QueryEditor db={db} onChange={handleChange} />
            <Toolbar.ToggleGroup type='single' value={selected} onValueChange={handleVariantChange}>
              {VARIANTS.map(({ value, icon, label }) => (
                <Toolbar.ToggleGroupItem key={value} value={value} aria-label={label} title={label}>
                  <Icon icon={icon} size={4} />
                </Toolbar.ToggleGroupItem>
              ))}
            </Toolbar.ToggleGroup>
          </Toolbar.Root>
        </Panel.Toolbar>
      )}
      <Panel.Content>
        <Visualization variant={selected} model={model} onNodeHover={handleHover} />
      </Panel.Content>
    </Panel.Root>
  );
};
