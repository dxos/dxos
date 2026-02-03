//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Surface, useAppGraph } from '@dxos/app-framework/react';
import { type Node, useNode } from '@dxos/plugin-graph';
import { IconButton, Main as NaturalMain, Toolbar, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/react-ui-attention';

import { useCompanions, useSimpleLayoutState } from '../../hooks';
import { meta } from '../../meta';
import { ContentError } from '../ContentError';
import { ContentLoading } from '../ContentLoading';

const DRAWER_NAME = 'SimpleLayout.Drawer';

/**
 * Companion drawer component.
 */
export const Drawer = () => {
  const { t } = useTranslation(meta.id);
  const { state, updateState } = useSimpleLayoutState();
  const { graph } = useAppGraph();

  const placeholder = useMemo(() => <ContentLoading />, []);

  // Get all companions for the current active (primary) item.
  const activeId = state.active ?? state.workspace;
  const companions = useCompanions(activeId);
  const { companionId, variant } = useSelectedCompanion(companions, state.companionVariant);

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

  // Handle tab click to switch companions.
  const handleTabClick = useCallback(
    (companion: Node.Node) => {
      const [, companionVariant] = companion.id.split(ATTENDABLE_PATH_SEPARATOR);
      updateState((s) => ({ ...s, companionVariant }));
    },
    [updateState],
  );

  // Handle expand/collapse toggle.
  const handleToggleExpand = useCallback(() => {
    updateState((s) => ({
      ...s,
      drawerState: s.drawerState === 'full' ? 'expanded' : 'full',
    }));
  }, [updateState]);

  // Handle close.
  const handleClose = useCallback(() => {
    updateState((s) => ({ ...s, drawerState: 'closed' }));
  }, [updateState]);

  const drawerState = state.drawerState ?? 'closed';
  if (drawerState === 'closed') {
    return null;
  }

  const isFullyExpanded = drawerState === 'full';

  return (
    <NaturalMain.Drawer label={t('drawer label')}>
      <Toolbar.Root>
        {/* TODO(thure): IMPORTANT: This is a tablist; it should be implemented as such. */}
        <div role='tablist' className='flex-1 min-is-0 overflow-x-auto scrollbar-none flex gap-1'>
          {/* TODO(burdon): Factor out in common with NavBar. */}
          {companions.map((companion) => (
            <IconButton
              key={companion.id}
              role='tab'
              aria-selected={companionId === companion.id}
              icon={companion.properties.icon}
              iconOnly
              label={toLocalizedString(companion.properties.label, t)}
              variant={companionId === companion.id ? 'primary' : 'ghost'}
              onClick={() => handleTabClick(companion)}
            />
          ))}
        </div>
        <Toolbar.Separator variant='gap' />
        <Toolbar.IconButton
          icon={isFullyExpanded ? 'ph--arrow-down--regular' : 'ph--arrow-up--regular'}
          iconOnly
          label={isFullyExpanded ? t('collapse drawer label') : t('expand drawer label')}
          onClick={handleToggleExpand}
        />
        <Toolbar.IconButton icon='ph--x--regular' iconOnly label={t('close drawer label')} onClick={handleClose} />
      </Toolbar.Root>
      {/* TODO(burdon): Fix containment. */}
      <div>
        <Surface role='article' data={data} limit={1} fallback={ContentError} placeholder={placeholder} />
      </div>
    </NaturalMain.Drawer>
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
