//
// Copyright 2023 DXOS.org
//

import * as Option from 'effect/Option';
import React, { useCallback, useState } from 'react';

import { Common, createIntent } from '@dxos/app-framework';
import { useAppGraph, useCapabilities, useIntentDispatcher } from '@dxos/app-framework/react';
import { isLiveObject } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
import { Graph } from '@dxos/plugin-graph';
import { SpaceAction } from '@dxos/plugin-space/types';
import { Toolbar, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { AttentionProvider } from '@dxos/react-ui-attention';
import { Stack, StackItem } from '@dxos/react-ui-stack';
import { type Collection } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { meta } from '../meta';
import {
  type AddSectionPosition,
  type CollapsedSections,
  type StackSectionItem,
  type StackSectionMetadata,
  type StackSectionView,
} from '../types';

import { StackContext } from './StackContext';
import { StackSection } from './StackSection';

type StackContainerProps = {
  id: string;
  collection: Collection.Collection;
};

const StackContainer = ({ id, collection }: StackContainerProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const { graph } = useAppGraph();
  const { t } = useTranslation(meta.id);
  const allMetadata = useCapabilities(Common.Capability.Metadata);
  const [collapsedSections, setCollapsedSections] = useState<CollapsedSections>({});

  // TODO(wittjosiah): Re-implement stack views with relations.
  // const defaultStack = useMemo(() => Obj.make(StackViewType, { sections: {} }), [collection]);
  // const stack = (collection.views[StackViewType.typename]?.target as StackViewType | undefined) ?? defaultStack;
  // useEffect(() => {
  //   if (!collection.views[StackViewType.typename]) {
  //     collection.views[StackViewType.typename] = Ref.make(stack);
  //   }
  // }, [collection, stack]);

  const items =
    collection.objects
      // TODO(wittjosiah): Should the database handle this differently?
      // TODO(wittjosiah): Render placeholders for missing objects so they can be removed from the stack?
      .map((object) => object.target)
      .filter(isNonNullable)
      .map((object) => {
        const metadata = allMetadata.find((m) => m.id === (Obj.getTypename(object) ?? 'never'))
          ?.metadata as StackSectionMetadata;
        const view = {
          // ...stack.sections[object.id],
          collapsed: collapsedSections[Obj.getDXN(object).toString()],
          title:
            (object as any)?.title ??
            // TODO(wittjosiah): `getNode` is not reactive.
            toLocalizedString(
              Graph.getNode(graph, Obj.getDXN(object).toString()).pipe(Option.getOrNull)?.properties.label,
              t,
            ),
        } as StackSectionView;
        return { id: Obj.getDXN(object).toString(), object, metadata, view } satisfies StackSectionItem;
      }) ?? [];

  const handleDelete = useCallback(
    async (id: string) => {
      const index = collection.objects
        .map((object) => object.target)
        .filter(isNonNullable)
        .findIndex((section) => Obj.getDXN(section).toString() === id);
      const object = collection.objects[index].target;
      if (isLiveObject(object)) {
        await dispatch(
          createIntent(SpaceAction.RemoveObjects, {
            objects: [object],
            target: collection,
          }),
        );

        // TODO(wittjosiah): The section should also be removed, but needs to be restored if the action is undone.
        // delete stack.sections[Path.last(path)];
      }
    },
    [collection, dispatch],
  );

  const handleAdd = useCallback(
    async (id: string, position: AddSectionPosition) => {
      await dispatch?.(
        // TODO(wittjosiah): Use object creation dialog.
        createIntent(Common.LayoutAction.UpdateDialog, {
          part: 'dialog',
          subject: `${meta.id}/AddSectionDialog`,
          options: {
            blockAlign: 'start',
            props: {
              path: id,
              position,
              collection,
            },
          },
        }),
      );
    },
    [collection, dispatch],
  );

  const handleNavigate = useCallback(
    async (id: string) => {
      await dispatch(createIntent(Common.LayoutAction.Open, { part: 'main', subject: [id] }));
    },
    [dispatch],
  );

  const handleCollapse = useCallback(
    (id: string, collapsed: boolean) => setCollapsedSections((prev) => ({ ...prev, [id]: collapsed })),
    [],
  );

  const handleAddSection = useCallback(
    () =>
      dispatch?.(
        createIntent(SpaceAction.OpenCreateObject, {
          target: collection,
          navigable: false,
        }),
      ),
    [collection, dispatch],
  );

  return (
    <StackItem.Content
      toolbar
      classNames='container-max-width overflow-hidden border-l border-r border-subduedSeparator'
    >
      <Toolbar.Root>
        <Toolbar.IconButton
          icon='ph--plus--regular'
          iconOnly
          label='Add section'
          data-testid='stack.addSection'
          onClick={handleAddSection}
        />
      </Toolbar.Root>
      <AttentionProvider id={id}>
        <StackContext.Provider
          value={{
            onCollapse: handleCollapse,
            onNavigate: handleNavigate,
            onDelete: handleDelete,
            onAdd: handleAdd,
          }}
        >
          <Stack orientation='vertical' size='intrinsic' id={id} data-testid='main.stack' classNames='overflow-y-auto'>
            {items.map((item) => (
              <StackSection key={item.id} {...item} />
            ))}
          </Stack>
        </StackContext.Provider>
      </AttentionProvider>
    </StackItem.Content>
  );
};

export default StackContainer;
