//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { type Filter, Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { type TreeNode } from '@dxos/react-ui-graph';
import { QueryEditor, type QueryEditorProps, useQueryBuilder } from '@dxos/react-ui-query';
import * as Panel from '@dxos/react-ui/Panel';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { DxAnchorActivate } from '@dxos/ui-types';
import '@dxos/react-ui-graph/styles/graph.css';

import { type ExplorerArticleVariant, VARIANTS, Visualization, isVariant } from '#components';
import { useGraphModel } from '#hooks';
import { type Graph } from '#types';

export type { ExplorerArticleVariant } from '#components';

export type ExplorerArticleProps = AppSurface.ObjectArticleProps<Graph.Graph>;

export const ExplorerArticle = ({ role, subject, variant }: ExplorerArticleProps) => {
  const [graph] = useObject(subject);
  // The graph opens on its saved query until the toolbar's query is edited.
  const saved = useQueryBuilder(graph?.query.raw);
  const [edited, setEdited] = useState<{ filter?: Filter.Any }>();

  const db = graph && Obj.getDatabase(graph);
  const model = useGraphModel(db, edited ? edited.filter : saved);

  const handleFilterChange = useCallback<NonNullable<QueryEditorProps['onFilterChange']>>(
    ({ filter }) => setEdited({ filter }),
    [],
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

  // Dismiss the preview popover. The eid/label/trigger fields are placeholders ignored on
  // `state: false`.
  const handleDismiss = useCallback(() => {
    document.defaultView?.dispatchEvent(
      new DxAnchorActivate({ eid: '', label: '', trigger: document.body, state: false }),
    );
  }, []);

  const handleHover = useCallback((node: TreeNode | null, event?: MouseEvent) => {
    // Pointer left the node/label: keep the popover open so it can be hovered/interacted with.
    // The popover is dismissed only on an explicit click on the component surface (handleDismiss).
    if (!node || !event) {
      return;
    }
    const obj = node.data;
    if (!obj || !Obj.isObject(obj)) {
      return;
    }
    const eid = Obj.getURI(obj);
    if (!eid) {
      return;
    }

    const target = event.target as HTMLElement;
    target.dispatchEvent(
      new DxAnchorActivate({
        eid,
        kind: 'card',
        trigger: target,
        label: Obj.getLabel(obj) ?? eid,
      }),
    );
  }, []);

  const showToolbar = role === AppSurface.Article.role;

  if (!db || !model) {
    return null;
  }

  return (
    <Panel.Root role={role}>
      {showToolbar && (
        <Panel.Header>
          <Toolbar.Root>
            <QueryEditor db={db} value={graph?.query.raw} onFilterChange={handleFilterChange} />
            <Toolbar.ToggleGroup type='single' value={selected} onValueChange={handleVariantChange}>
              {VARIANTS.map(({ value, icon, label }) => (
                <ToggleGroup.Item key={value} value={value} icon={icon} iconOnly label={label} />
              ))}
            </Toolbar.ToggleGroup>
          </Toolbar.Root>
        </Panel.Header>
      )}
      <Panel.Body asChild>
        <Visualization.Root
          classNames='dx-base-surface'
          variant={selected}
          model={model}
          onSurfaceClick={handleDismiss}
        >
          <Visualization.Graph onNodeHover={handleHover} />
          <Visualization.TypeFilter />
        </Visualization.Root>
      </Panel.Body>
    </Panel.Root>
  );
};

ExplorerArticle.displayName = 'ExplorerArticle';
