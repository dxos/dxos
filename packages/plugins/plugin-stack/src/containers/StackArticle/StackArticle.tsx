//
// Copyright 2023 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { type Collection, Obj } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { Menu, createMenuAction } from '@dxos/react-ui-menu';
import { Mosaic, type MosaicEventHandler } from '@dxos/react-ui-mosaic';
import { arrayMove, isNonNullable } from '@dxos/util';

import { Stack, type StackSectionItem } from '#components';
import { meta } from '#meta';

export type StackArticleProps = AppSurface.ObjectArticleProps<Collection.Collection>;

export const StackArticle = ({ attendableId, subject: collection }: StackArticleProps) => {
  const { invokePromise } = useOperationInvoker();
  const { t } = useTranslation(meta.profile.key);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const collectionObjects = useAtomValue(createCollectionObjects(collection));
  const items = useMemo<StackSectionItem[]>(
    () => collectionObjects.map((object) => ({ id: Obj.getURI(object), object })),
    [collectionObjects],
  );

  const collapsed = useMemo<ReadonlySet<string>>(
    () => new Set(Object.keys(collapsedSections).filter((id) => collapsedSections[id])),
    [collapsedSections],
  );

  // Index of a section within the collection by its object URI.
  const findIndex = useCallback(
    (id: string) => collection.objects.findIndex((ref) => ref.target != null && Obj.getURI(ref.target) === id),
    [collection],
  );

  // Reorder sections in place. Placeholder/tile drop locations are 1-based with half-step placeholders
  // between tiles, so the floor of the drop location is the destination array index (see Mosaic.Stack).
  const eventHandler = useMemo<MosaicEventHandler<StackSectionItem>>(
    () => ({
      id: Obj.getURI(collection),
      canDrop: ({ source }) =>
        collection.objects.some((ref) => ref.target != null && Obj.getURI(ref.target) === source.id),
      onDrop: ({ source, target }) => {
        const to =
          target?.type === 'tile' || target?.type === 'placeholder'
            ? target.location
            : target?.type === 'container'
              ? collection.objects.length
              : -1;
        const insert = typeof to === 'number' && to >= 0 ? Math.floor(to) : -1;
        if (insert < 0) {
          return;
        }

        Obj.update(collection, (collection) => {
          const from = findIndex(source.id);
          if (from !== -1) {
            arrayMove(collection.objects, from, insert);
          }
        });
      },
    }),
    [collection, findIndex],
  );

  const handleMoveUp = useCallback(
    (id: string) => {
      const index = findIndex(id);
      if (index > 0) {
        Obj.update(collection, (collection) => {
          const [ref] = collection.objects.splice(index, 1);
          collection.objects.splice(index - 1, 0, ref);
        });
      }
    },
    [collection, findIndex],
  );

  const handleMoveDown = useCallback(
    (id: string) => {
      const index = findIndex(id);
      if (index >= 0 && index < collection.objects.length - 1) {
        Obj.update(collection, (collection) => {
          const [ref] = collection.objects.splice(index, 1);
          collection.objects.splice(index + 1, 0, ref);
        });
      }
    },
    [collection, findIndex],
  );

  const handleDelete = useCallback(
    (id: string) => {
      const index = findIndex(id);
      if (index >= 0) {
        Obj.update(collection, (collection) => {
          collection.objects.splice(index, 1);
        });
      }
    },
    [collection, findIndex],
  );

  const handleAdd = useCallback(
    (id: string) =>
      invokePromise(SpaceOperation.OpenCreateObject, {
        target: collection,
        navigable: false,
        // The created object is appended; move it to immediately after the originating section.
        onCreateObject: (object: Obj.Unknown) => {
          const from = findIndex(Obj.getURI(object));
          const anchor = findIndex(id);
          if (from >= 0 && anchor >= 0) {
            Obj.update(collection, (collection) => {
              const [ref] = collection.objects.splice(from, 1);
              collection.objects.splice(anchor < from ? anchor + 1 : anchor, 0, ref);
            });
          }
        },
      }),
    [collection, invokePromise, findIndex],
  );

  const handleCollapse = useCallback(
    (id: string, value: boolean) => setCollapsedSections((prev) => ({ ...prev, [id]: value })),
    [],
  );

  const handleCollapseAll = useCallback(
    () => setCollapsedSections(Object.fromEntries(collectionObjects.map((object) => [Obj.getURI(object), true]))),
    [collectionObjects],
  );

  const handleExpandAll = useCallback(() => setCollapsedSections({}), []);

  const optionsMenu = useMemo(
    () => [
      createMenuAction('collapse-all', handleCollapseAll, {
        label: ['collapse-all.label', { ns: meta.profile.key }],
        icon: 'ph--arrows-in-line-vertical--regular',
        testId: 'stack.collapse-all',
      }),
      createMenuAction('expand-all', handleExpandAll, {
        label: ['expand-all.label', { ns: meta.profile.key }],
        icon: 'ph--arrows-out-line-vertical--regular',
        testId: 'stack.expand-all',
      }),
    ],
    [handleCollapseAll, handleExpandAll],
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
    <Panel.Root classNames='dx-document'>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.IconButton
            square
            icon='ph--plus--regular'
            iconOnly
            label={t('add-section.label')}
            data-testid='stack.addSection'
            onClick={handleAddSection}
          />
          <Toolbar.Separator />
          <Menu.Root>
            <Menu.Trigger asChild>
              <Toolbar.IconButton
                square
                icon='ph--dots-three-vertical--regular'
                iconOnly
                label={t('options.label')}
                data-testid='stack.options'
              />
            </Menu.Trigger>
            <Menu.Content items={optionsMenu} />
          </Menu.Root>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <Stack.Root
          id={Obj.getURI(collection)}
          attendableId={attendableId}
          collapsed={collapsed}
          eventHandler={eventHandler}
          onCollapse={handleCollapse}
          onAdd={handleAdd}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onDelete={handleDelete}
        >
          <Stack.Content data-testid='main.stack'>
            <Stack.Viewport>
              <Mosaic.Stack
                orientation='vertical'
                items={items}
                getId={(item) => item.id}
                Tile={(tileProps) => <Stack.Section {...tileProps} />}
              />
            </Stack.Viewport>
          </Stack.Content>
        </Stack.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

const createCollectionObjects = Atom.family((collection: Collection.Collection) =>
  Atom.make((get) => {
    const snapshot = get(Obj.atom(collection));
    return snapshot.objects.map((ref) => get(Obj.atomReactive(ref))).filter(isNonNullable);
  }),
);
