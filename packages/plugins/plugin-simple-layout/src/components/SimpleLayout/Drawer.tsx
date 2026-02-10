//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface, useAppGraph } from '@dxos/app-framework/react';
import { type Node, useNode } from '@dxos/plugin-graph';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/react-ui-attention';
import { MenuProvider, ToolbarMenu, useMenuActions } from '@dxos/react-ui-menu';
import { Layout } from '@dxos/react-ui-mosaic';

import { useCompanions, useDrawerActions, useSimpleLayoutState } from '../../hooks';
import { ContentError } from '../ContentError';
import { ContentLoading } from '../ContentLoading';

const DRAWER_NAME = 'SimpleLayout.Drawer';

/**
 * Companion drawer component.
 */
export const Drawer = () => {
  const { graph } = useAppGraph();
  const { state: layoutState } = useSimpleLayoutState();

  const placeholder = useMemo(() => <ContentLoading />, []);

  // Get all companions for the current active (primary) item.
  const activeId = layoutState.active ?? layoutState.workspace;
  const companions = useCompanions(activeId);
  const { companionId, variant } = useSelectedCompanion(companions, layoutState.companionVariant);

  // Get node for the selected companion.
  const node = useNode(graph, companionId);
  const parentNode = useNode(graph, activeId);

  // Build Surface data for the companion content.
  const data = useMemo(() => {
    return (
      node && {
        attendableId: companionId,
        subject: node.data,
        companionTo: parentNode?.data,
        properties: node.properties,
        variant,
      }
    );
  }, [companionId, node, parentNode, variant]);

  // Get drawer actions (tabs + toolbar buttons).
  const { actions, onAction } = useDrawerActions(DRAWER_NAME);
  const menu = useMenuActions(actions);

  return (
    <Layout.Main toolbar>
      <MenuProvider {...menu} onAction={onAction} alwaysActive>
        <ToolbarMenu density='coarse' />
      </MenuProvider>
      <Surface role='article' data={data} limit={1} fallback={ContentError} placeholder={placeholder} />
    </Layout.Main>
  );
};

Drawer.displayName = DRAWER_NAME;

/** Parse entry ID to extract primary ID and variant. */
const parseEntryId = (entryId: string) => {
  const [id, variant] = entryId.split(ATTENDABLE_PATH_SEPARATOR);
  return { id, variant };
};

/**
 * Resolves which companion to show based on variant preference.
 * Falls back to first available if preferred variant not available.
 */
const useSelectedCompanion = (companions: Node.Node[], preferredVariant?: string) => {
  const selectedCompanion = useMemo(() => {
    if (companions.length === 0) {
      return undefined;
    }

    // Try to find companion matching the preferred variant.
    if (preferredVariant) {
      const preferred = companions.find((c) => {
        const { variant } = parseEntryId(c.id);
        return variant === preferredVariant;
      });
      if (preferred) {
        return preferred;
      }
    }

    // Fallback to first companion.
    return companions[0];
  }, [companions, preferredVariant]);

  const companionId = selectedCompanion?.id;
  const { variant } = parseEntryId(companionId ?? '');

  return { selectedCompanion, companionId, variant };
};
