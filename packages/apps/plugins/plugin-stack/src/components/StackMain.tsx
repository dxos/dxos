//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React, { useEffect, useMemo, useState } from 'react';

import { useGraph } from '@braneframe/plugin-graph';
import { type CollectionType, StackViewType } from '@braneframe/types';
import {
  LayoutAction,
  NavigationAction,
  Surface,
  parseMetadataResolverPlugin,
  useIntentDispatcher,
  useResolvePlugin,
} from '@dxos/app-framework';
import { create, isReactiveObject, getType } from '@dxos/echo-schema';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { Button, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Path, type MosaicDropEvent, type MosaicMoveEvent, type MosaicDataItem } from '@dxos/react-ui-mosaic';
import {
  Stack,
  type StackProps,
  type CollapsedSections,
  type AddSectionPosition,
  type StackSectionItem,
} from '@dxos/react-ui-stack';
import { nonNullable } from '@dxos/util';

import { AddSection } from './AddSection';
import { SECTION_IDENTIFIER, STACK_PLUGIN } from '../meta';

const SectionContent: StackProps['SectionContent'] = ({ data }) => {
  // TODO(wittjosiah): Better section placeholder.
  return <Surface role='section' data={{ object: data }} placeholder={<></>} />;
};

type StackMainProps = {
  collection: CollectionType;
  separation?: boolean;
};

const StackMain = ({ collection, separation }: StackMainProps) => {
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

  const id = `stack-${collection.id}`;
  const items =
    collection.objects
      // TODO(wittjosiah): Should the database handle this differently?
      // TODO(wittjosiah): Render placeholders for missing objects so they can be removed from the stack?
      .filter(nonNullable)
      .map((object) => {
        const metadata = metadataPlugin?.provides.metadata.resolver(
          getType(object)?.itemId ?? 'never',
        ) as StackSectionItem['metadata'];
        const view = {
          ...stack.sections[object.id],
          collapsed: collapsedSections[fullyQualifiedId(object)],
          title:
            (object as any)?.title ?? toLocalizedString(graph.findNode(fullyQualifiedId(object))?.properties.label, t),
        } as StackSectionItem['view'];
        return { id: fullyQualifiedId(object), object, metadata, view };
      }) ?? [];

  const handleOver = ({ active }: MosaicMoveEvent<number>) => {
    const parseData = metadataPlugin?.provides.metadata.resolver(active.type)?.parse;
    const data = parseData ? parseData(active.item, 'object') : active.item;

    // TODO(wittjosiah): Prevent dropping items which don't have a section renderer?
    //  Perhaps stack plugin should just provide a fallback section renderer.
    if (!isReactiveObject(data)) {
      return 'reject';
    }

    const exists = items.findIndex(({ id }) => id === active.item.id) >= 0;
    if (!exists) {
      return 'copy';
    } else {
      return 'reject';
    }
  };

  const handleDrop = ({ operation, active, over }: MosaicDropEvent<number>) => {
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

  const handleDelete = (path: string) => {
    const index = collection.objects
      .filter(nonNullable)
      .findIndex((section) => fullyQualifiedId(section) === Path.last(path));
    if (index >= 0) {
      collection.objects.splice(index, 1);
      delete stack.sections[Path.last(path)];
    }
  };

  // TODO(wittjosiah): Factor out.

  const handleNavigate = async (object: MosaicDataItem) => {
    const toId = fullyQualifiedId(object);
    await dispatch([
      {
        action: NavigationAction.OPEN,
        data: { activeParts: { main: [toId] } },
      },
      { action: LayoutAction.SCROLL_INTO_VIEW, data: { id: toId } },
    ]);
  };

  const handleTransform = (item: MosaicDataItem, type?: string) => {
    const parseData = type && metadataPlugin?.provides.metadata.resolver(type)?.parse;
    return parseData ? parseData(item, 'view-object') : item;
  };

  const handleAddSection = (path: string, position: AddSectionPosition) => {
    void dispatch?.({
      action: LayoutAction.SET_LAYOUT,
      data: {
        element: 'dialog',
        component: `${STACK_PLUGIN}/AddSectionDialog`,
        subject: { path, position, collection },
      },
    });
  };

  const handleCollapseSection = (id: string, collapsed: boolean) => {
    setCollapsedSections((prev) => ({ ...prev, [id]: collapsed }));
  };

  return (
    <>
      <Stack
        id={id}
        data-testid='main.stack'
        SectionContent={SectionContent}
        type={SECTION_IDENTIFIER}
        items={items}
        separation={separation}
        transform={handleTransform}
        onDrop={handleDrop}
        onOver={handleOver}
        onDeleteSection={handleDelete}
        onNavigateToSection={handleNavigate}
        onAddSection={handleAddSection}
        onCollapseSection={handleCollapseSection}
      />

      {items.length === 0 ? (
        <AddSection collection={collection} />
      ) : (
        <div role='none' className='mlb-2 pli-2'>
          <Button
            data-testid='stack.createSection'
            classNames='is-full gap-2'
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
    </>
  );
};

export default StackMain;
