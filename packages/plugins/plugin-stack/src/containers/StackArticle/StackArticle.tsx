//
// Copyright 2023 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import * as Option from 'effect/Option';
import React, { useCallback, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { useAppGraph, type AppSurface } from '@dxos/app-toolkit/ui';
import { Annotation, type Collection, Obj, type Ref, Type } from '@dxos/echo';
import { AtomObj } from '@dxos/echo-atom';
import { Graph } from '@dxos/plugin-graph';
import { SpaceOperation } from '@dxos/plugin-space';
import { Toolbar, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Stack, StackItem } from '@dxos/react-ui-stack';
import { isNonNullable } from '@dxos/util';

import { StackContext, StackSection } from '#components';
import { meta } from '#meta';
import {
  type AddSectionPosition,
  type CollapsedSections,
  type StackSectionItem,
  type StackSectionMetadata,
  type StackSectionView,
} from '#types';

const collectionObjectsFamily = Atom.family((collection: Collection.Collection) =>
  Atom.make((get) => {
    const snapshot = get(AtomObj.make(collection));
    return (
      snapshot.objects
        // TODO(wittjosiah): Why isn't this type inferred correctly?
        .map((ref: Ref.Ref<Obj.Unknown>) => get(AtomObj.makeWithReactive(ref)))
        .filter(isNonNullable)
    );
  }),
);

type StackArticleProps = AppSurface.ObjectArticleProps<Collection.Collection>;

export const StackArticle = ({ attendableId, subject: collection }: StackArticleProps) => {
  const { invokePromise } = useOperationInvoker();
  const { graph } = useAppGraph();
  const { t } = useTranslation(meta.id);
  const [collapsedSections, setCollapsedSections] = useState<CollapsedSections>({});

  // TODO(wittjosiah): Re-implement stack views with relations.
  // const defaultStack = useMemo(() => Obj.make(StackViewType, { sections: {} }), [collection]);
  // const stack = (collection.views[StackViewType.typename]?.target as StackViewType | undefined) ?? defaultStack;
  // useEffect(() => {
  //   if (!collection.views[StackViewType.typename]) {
  //     collection.views[StackViewType.typename] = Ref.make(stack);
  //   }
  // }, [collection, stack]);

  const collectionObjects = useAtomValue(collectionObjectsFamily(collection));
  const items = collectionObjects.map((object: Obj.Unknown) => {
    const type = Obj.getType(object);
    const iconAnnotation = type
      ? Option.getOrUndefined(Annotation.IconAnnotation.get(Type.getSchema(type)))
      : undefined;
    const metadata: StackSectionMetadata = { icon: iconAnnotation?.icon };
    const view = {
      // ...stack.sections[object.id],
      collapsed: collapsedSections[Obj.getURI(object)],
      title:
        (object as any)?.title ??
        // TODO(wittjosiah): `getNode` is not reactive.
        toLocalizedString(Graph.getNode(graph, Obj.getURI(object)).pipe(Option.getOrNull)?.properties.label, t),
    } as StackSectionView;
    return { id: Obj.getURI(object), object, metadata, view } satisfies StackSectionItem;
  });

  const handleDelete = useCallback(
    async (id: string) => {
      const index = collection.objects
        .map((object) => object.target)
        .filter(isNonNullable)
        .findIndex((section) => Obj.getURI(section) === id);
      const object = collection.objects[index].target;
      if (Obj.isObject(object)) {
        await invokePromise(SpaceOperation.RemoveObjects, {
          objects: [object],
          target: collection,
        });

        // TODO(wittjosiah): The section should also be removed, but needs to be restored if the action is undone.
        // delete stack.sections[Path.last(path)];
      }
    },
    [collection, invokePromise],
  );

  const handleAdd = useCallback(
    async (id: string, position: AddSectionPosition) => {
      // TODO(wittjosiah): Use object creation dialog.
      await invokePromise(LayoutOperation.UpdateDialog, {
        subject: `${meta.id}.AddSectionDialog`,
        blockAlign: 'start',
        props: {
          path: id,
          position,
          collection,
        },
      });
    },
    [collection, invokePromise],
  );

  const handleNavigate = useCallback(
    async (id: string) => {
      await invokePromise(LayoutOperation.Open, { subject: [id] });
    },
    [invokePromise],
  );

  const handleCollapse = useCallback(
    (id: string, collapsed: boolean) => setCollapsedSections((prev) => ({ ...prev, [id]: collapsed })),
    [],
  );

  const handleAddSection = useCallback(
    () =>
      invokePromise(SpaceOperation.OpenCreateObject, {
        target: collection,
        navigable: false,
      }),
    [collection, invokePromise],
  );

  return (
    <StackItem.Content toolbar classNames='dx-document'>
      <Toolbar.Root>
        <Toolbar.IconButton
          icon='ph--plus--regular'
          iconOnly
          label='Add section'
          data-testid='stack.addSection'
          onClick={handleAddSection}
        />
      </Toolbar.Root>
      <StackContext.Provider
        value={{
          attendableId,
          onCollapse: handleCollapse,
          onNavigate: handleNavigate,
          onDelete: handleDelete,
          onAdd: handleAdd,
        }}
      >
        <Stack
          orientation='vertical'
          size='intrinsic'
          id={Obj.getURI(collection)}
          data-testid='main.stack'
          classNames='overflow-y-auto'
        >
          {items.map((item) => (
            <StackSection key={item.id} {...item} />
          ))}
        </Stack>
      </StackContext.Provider>
    </StackItem.Content>
  );
};
