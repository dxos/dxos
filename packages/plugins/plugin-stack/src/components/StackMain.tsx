//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React, { useEffect, useMemo, useState } from 'react';

import {
  LayoutAction,
  NavigationAction,
  Surface,
  parseMetadataResolverPlugin,
  useIntentDispatcher,
  useResolvePlugin,
} from '@dxos/app-framework';
import { create, getType, fullyQualifiedId, isReactiveObject } from '@dxos/client/echo';
import { useGraph } from '@dxos/plugin-graph';
import { SpaceAction } from '@dxos/plugin-space';
import { type CollectionType } from '@dxos/plugin-space/types';
import { Button, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { AttentionProvider } from '@dxos/react-ui-attention';
import { type MosaicDataItem, type MosaicDropEvent, type MosaicMoveEvent, Mosaic, Path } from '@dxos/react-ui-mosaic';
import { Stack } from '@dxos/react-ui-stack';
import { nonNullable } from '@dxos/util';

import { AddSection } from './AddSection';
import { SECTION_IDENTIFIER, STACK_PLUGIN } from '../meta';
import {
  StackViewType,
  type CollectionItem,
  type CollapsedSections,
  type StackSectionMetadata,
  type StackSectionView,
  type AddSectionPosition,
} from '../types';

const _SectionContent = ({ data }: { data: CollectionItem }) => {
  // TODO(wittjosiah): Better section placeholder.
  return <Surface role='section' data={{ object: data }} limit={1} placeholder={<></>} />;
};

type StackMainProps = {
  id: string;
  collection: CollectionType;
  separation?: boolean;
};

const StackMain = ({ id, collection, separation }: StackMainProps) => {
  const dispatch = useIntentDispatcher();
  const { graph } = useGraph();
  const { t } = useTranslation(STACK_PLUGIN);
  const metadataPlugin = useResolvePlugin(parseMetadataResolverPlugin);
  const defaultStack = useMemo(() => create(StackViewType, { sections: {} }), [collection]);
  const stack = (collection.views[StackViewType.typename] as StackViewType) ?? defaultStack;
  const [collapsedSections, setCollapsedSections] = useState<CollapsedSections>({});

  useEffect(() => {
    if (!collection.views[StackViewType.typename]) {
      collection.views[StackViewType.typename] = stack;
    }
  }, [collection, stack]);

  const items =
    collection.objects
      // TODO(wittjosiah): Should the database handle this differently?
      // TODO(wittjosiah): Render placeholders for missing objects so they can be removed from the stack?
      .filter(nonNullable)
      .map((object) => {
        const metadata = metadataPlugin?.provides.metadata.resolver(
          getType(object)?.objectId ?? 'never',
        ) as StackSectionMetadata;
        const view = {
          ...stack.sections[object.id],
          collapsed: collapsedSections[fullyQualifiedId(object)],
          title:
            (object as any)?.title ?? toLocalizedString(graph.findNode(fullyQualifiedId(object))?.properties.label, t),
        } as StackSectionView;
        return { id: fullyQualifiedId(object), object, metadata, view };
      }) ?? [];

  const _handleOver = ({ active, over }: MosaicMoveEvent<number>) => {
    // TODO(thure): Eventually Stack should handle foreign draggables.
    if (active.type !== SECTION_IDENTIFIER) {
      return 'reject';
    }
    if (Path.parent(active.path) === Path.parent(over.path)) {
      return 'rearrange';
    }

    const parseData = metadataPlugin?.provides.metadata.resolver(active.type)?.parse;
    const data = parseData ? parseData(active.item, 'object') : active.item;

    // TODO(wittjosiah): Prevent dropping items which don't have a section renderer?
    //  Perhaps stack plugin should just provide a fallback section renderer.
    if (!isReactiveObject(data)) {
      return 'reject';
    }

    const exists = items.findIndex(({ id }) => id === active.item.id) >= 0;
    if (!exists) {
      return 'transfer';
    } else {
      return 'reject';
    }
  };

  const _handleDrop = ({ operation, active, over }: MosaicDropEvent<number>) => {
    if (
      (active.path === Path.create(id, active.item.id) || active.path === id) &&
      (operation !== 'copy' || over.path === Path.create(id, over.item.id) || over.path === id)
    ) {
      collection.objects.splice(active.position!, 1);
      delete stack.sections[active.item.id];
    }

    const parseData = metadataPlugin?.provides.metadata.resolver(active.type)?.parse;
    const object = parseData?.(active.item, 'object');
    if (object && over.path === Path.create(id, over.item.id)) {
      collection.objects.splice(over.position!, 0, object);
    } else if (object && over.path === id) {
      collection.objects.push(object);
    }

    if (!stack.sections[object.id]) {
      stack.sections[object.id] = {};
    }
  };

  const _handleDelete = async (path: string) => {
    const index = collection.objects
      .filter(nonNullable)
      .findIndex((section) => fullyQualifiedId(section) === Path.last(path));
    if (index >= 0) {
      await dispatch({
        action: SpaceAction.REMOVE_OBJECT,
        data: { object: collection.objects[index], collection },
      });

      // TODO(wittjosiah): The section should also be removed, but needs to be restored if the action is undone.
      // delete stack.sections[Path.last(path)];
    }
  };

  // TODO(wittjosiah): Factor out.

  const _handleNavigate = async (object: MosaicDataItem) => {
    const toId = fullyQualifiedId(object);
    await dispatch([
      {
        action: NavigationAction.OPEN,
        data: { activeParts: { main: [toId] } },
      },
      {
        action: LayoutAction.SCROLL_INTO_VIEW,
        data: { id: toId },
      },
    ]);
  };

  const _handleAddSection = (path: string, position: AddSectionPosition) => {
    void dispatch?.({
      action: LayoutAction.SET_LAYOUT,
      data: {
        element: 'dialog',
        component: `${STACK_PLUGIN}/AddSectionDialog`,
        subject: { path, position, collection },
      },
    });
  };

  const _handleCollapseSection = (id: string, collapsed: boolean) => {
    setCollapsedSections((prev) => ({ ...prev, [id]: collapsed }));
  };

  return (
    <AttentionProvider id={id}>
      <Mosaic.Root>
        <Mosaic.DragOverlay />
        <Stack orientation='vertical' size='intrinsic' id={id} data-testid='main.stack'></Stack>

        {items.length === 0 ? (
          <AddSection collection={collection} />
        ) : (
          <div role='none' className='flex mlb-2 pli-2 justify-center'>
            <Button
              data-testid='stack.createSection'
              classNames='gap-2'
              onClick={() =>
                dispatch?.({
                  action: LayoutAction.SET_LAYOUT,
                  data: {
                    element: 'dialog',
                    component: 'dxos.org/plugin/stack/AddSectionDialog',
                    subject: { position: 'afterAll', collection },
                  },
                })
              }
            >
              <Plus />
              <span className='sr-only'>{t('add section label')}</span>
            </Button>
          </div>
        )}
      </Mosaic.Root>
    </AttentionProvider>
  );
};

export default StackMain;
