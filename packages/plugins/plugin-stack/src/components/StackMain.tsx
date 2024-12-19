//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  createIntent,
  LayoutAction,
  NavigationAction,
  parseMetadataResolverPlugin,
  useIntentDispatcher,
  useResolvePlugin,
} from '@dxos/app-framework';
import { create, getType, fullyQualifiedId, isReactiveObject, makeRef } from '@dxos/client/echo';
import { useGraph } from '@dxos/plugin-graph';
import { SpaceAction } from '@dxos/plugin-space';
import { type CollectionType } from '@dxos/plugin-space/types';
import { Button, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { AttentionProvider } from '@dxos/react-ui-attention';
import { Stack } from '@dxos/react-ui-stack';
import { nonNullable } from '@dxos/util';

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
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const { graph } = useGraph();
  const { t } = useTranslation(STACK_PLUGIN);
  const metadataPlugin = useResolvePlugin(parseMetadataResolverPlugin);
  const defaultStack = useMemo(() => create(StackViewType, { sections: {} }), [collection]);
  const stack = (collection.views[StackViewType.typename]?.target as StackViewType | undefined) ?? defaultStack;
  const [collapsedSections, setCollapsedSections] = useState<CollapsedSections>({});

  useEffect(() => {
    if (!collection.views[StackViewType.typename]) {
      collection.views[StackViewType.typename] = makeRef(stack);
    }
  }, [collection, stack]);

  const items =
    collection.objects
      // TODO(wittjosiah): Should the database handle this differently?
      // TODO(wittjosiah): Render placeholders for missing objects so they can be removed from the stack?
      .map((object) => object.target)
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

  const handleDelete = useCallback(
    async (id: string) => {
      const index = collection.objects
        .map((object) => object.target)
        .filter(nonNullable)
        .findIndex((section) => fullyQualifiedId(section) === id);
      const object = collection.objects[index].target;
      if (isReactiveObject(object)) {
        await dispatch(createIntent(SpaceAction.RemoveObjects, { objects: [object], target: collection }));

        // TODO(wittjosiah): The section should also be removed, but needs to be restored if the action is undone.
        // delete stack.sections[Path.last(path)];
      }
    },
    [collection, dispatch],
  );

  const handleAdd = useCallback(
    async (id: string, position: AddSectionPosition) => {
      await dispatch?.(
        createIntent(LayoutAction.SetLayout, {
          element: 'dialog',
          component: `${STACK_PLUGIN}/AddSectionDialog`,
          subject: { path: id, position, collection },
        }),
      );
    },
    [collection, dispatch],
  );

  const handleNavigate = useCallback(
    async (id: string) => {
      await dispatch(createIntent(NavigationAction.Open, { activeParts: { main: [id] } }));
      await dispatch(createIntent(LayoutAction.ScrollIntoView, { id }));
    },
    [dispatch],
  );

  const handleCollapse = useCallback(
    (id: string, collapsed: boolean) => setCollapsedSections((prev) => ({ ...prev, [id]: collapsed })),
    [],
  );

  const handleAddSection = useCallback(
    () => dispatch?.(createIntent(SpaceAction.OpenCreateObject, { target: collection, navigable: false })),
    [collection, dispatch],
  );

  return (
    <AttentionProvider id={id}>
      <StackContext.Provider
        value={{
          onCollapse: handleCollapse,
          onNavigate: handleNavigate,
          onDelete: handleDelete,
          onAdd: handleAdd,
        }}
      >
        <Stack orientation='vertical' size='intrinsic' id={id} data-testid='main.stack'>
          {items.map((item) => (
            <StackSection key={item.id} {...item} />
          ))}
        </Stack>

        <div role='none' className='flex mlb-2 pli-2 justify-center'>
          <Button data-testid='stack.createSection' classNames='gap-2' onClick={handleAddSection}>
            <Plus />
            <span className='sr-only'>{t('add section label')}</span>
          </Button>
        </div>
      </StackContext.Provider>
    </AttentionProvider>
  );
};

export default StackMain;
