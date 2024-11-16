//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React, { useEffect, useMemo, useState } from 'react';

import {
  LayoutAction,
  NavigationAction,
  parseMetadataResolverPlugin,
  useIntentDispatcher,
  useResolvePlugin,
} from '@dxos/app-framework';
import { create, getType, fullyQualifiedId } from '@dxos/client/echo';
import { useGraph } from '@dxos/plugin-graph';
import { SpaceAction } from '@dxos/plugin-space';
import { type CollectionType } from '@dxos/plugin-space/types';
import { Button, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { AttentionProvider } from '@dxos/react-ui-attention';
import { Stack } from '@dxos/react-ui-stack';
import { nonNullable } from '@dxos/util';

import { AddSection } from './AddSection';
import { StackContext } from './StackContext';
import { StackSection } from './StackSection';
import { STACK_PLUGIN } from '../meta';
import {
  StackViewType,
  type CollapsedSections,
  type StackSectionMetadata,
  type StackSectionView,
  type StackSectionItem,
  type AddSectionPosition,
} from '../types';

type StackMainProps = {
  id: string;
  collection: CollectionType;
};

const StackMain = ({ id, collection }: StackMainProps) => {
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
        return { id: fullyQualifiedId(object), object, metadata, view } satisfies StackSectionItem;
      }) ?? [];

  const handleDelete = async (id: string) => {
    const index = collection.objects.filter(nonNullable).findIndex((section) => fullyQualifiedId(section) === id);
    if (index >= 0) {
      await dispatch({
        action: SpaceAction.REMOVE_OBJECT,
        data: { object: collection.objects[index], collection },
      });

      // TODO(wittjosiah): The section should also be removed, but needs to be restored if the action is undone.
      // delete stack.sections[Path.last(path)];
    }
  };

  const handleAdd = (id: string, position: AddSectionPosition) => {
    void dispatch?.({
      action: LayoutAction.SET_LAYOUT,
      data: {
        element: 'dialog',
        component: `${STACK_PLUGIN}/AddSectionDialog`,
        subject: { path: id, position, collection },
      },
    });
  };

  const handleNavigate = async (id: string) => {
    await dispatch([
      {
        action: NavigationAction.OPEN,
        data: { activeParts: { main: [id] } },
      },
      {
        action: LayoutAction.SCROLL_INTO_VIEW,
        data: { id },
      },
    ]);
  };

  const handleCollapse = (id: string, collapsed: boolean) => {
    setCollapsedSections((prev) => ({ ...prev, [id]: collapsed }));
  };

  return (
    <AttentionProvider id={id}>
      <StackContext.Provider
        value={{
          onCollapse: handleCollapse,
          onNavigate: handleNavigate,
          onDelete: handleDelete,
          onAdd: handleAdd,
        }}
      />
      <Stack orientation='vertical' size='intrinsic' id={id} data-testid='main.stack' classNames='divide-y-reverse'>
        {items.map((item) => (
          <StackSection key={item.id} {...item} />
        ))}
      </Stack>

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
    </AttentionProvider>
  );
};

export default StackMain;
