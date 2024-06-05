//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React, { type FC, useState } from 'react';

import { StackType, SectionType, FolderType } from '@braneframe/types';
import {
  LayoutAction,
  NavigationAction,
  Surface,
  parseMetadataResolverPlugin,
  useIntent,
  useResolvePlugin,
} from '@dxos/app-framework';
import { create, isReactiveObject, getType } from '@dxos/echo-schema';
import { getSpace, useQuery, Filter, fullyQualifiedId } from '@dxos/react-client/echo';
import { Button, useTranslation } from '@dxos/react-ui';
import { Path, type MosaicDropEvent, type MosaicMoveEvent, type MosaicDataItem } from '@dxos/react-ui-mosaic';
import { Stack, type StackProps, type CollapsedSections, type AddSectionPosition } from '@dxos/react-ui-stack';
import { nonNullable } from '@dxos/util';

import { STACK_PLUGIN } from '../meta';

const SectionContent: StackProps['SectionContent'] = ({ data }) => {
  // TODO(wittjosiah): Better section placeholder.
  return <Surface role='section' data={{ object: data }} placeholder={<></>} />;
};

const StackMain: FC<{ stack: StackType; separation?: boolean }> = ({ stack, separation }) => {
  const { dispatch } = useIntent();
  const metadataPlugin = useResolvePlugin(parseMetadataResolverPlugin);
  const { t } = useTranslation(STACK_PLUGIN);

  const id = `stack-${stack.id}`;
  const items = stack.sections
    .filter(nonNullable)
    // TODO(wittjosiah): Should the database handle this differently?
    // TODO(wittjosiah): Render placeholders for missing objects so they can be removed from the stack?
    .filter(({ object }) => object)
    .map(({ id, object }) => {
      const rest = metadataPlugin?.provides.metadata.resolver(getType(object!)?.itemId ?? 'never');
      return {
        id,
        object: object!,
        attendableId: fullyQualifiedId(object!),
        ...rest,
      };
    });
  const space = getSpace(stack);
  const [folder] = useQuery(space, Filter.schema(FolderType));

  const [collapsedSections, onChangeCollapsedSections] = useState<CollapsedSections>({});

  const handleOver = ({ active }: MosaicMoveEvent<number>) => {
    const parseData = metadataPlugin?.provides.metadata.resolver(active.type)?.parse;
    const data = parseData ? parseData(active.item, 'object') : active.item;

    // TODO(wittjosiah): Prevent dropping items which don't have a section renderer?
    //  Perhaps stack plugin should just provide a fallback section renderer.
    if (!isReactiveObject(data) || data instanceof StackType) {
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
      stack.sections.splice(active.position!, 1);
    }

    const parseData = metadataPlugin?.provides.metadata.resolver(active.type)?.parse;
    const object = parseData?.(active.item, 'object');
    // TODO(wittjosiah): Stop creating new section objects for each drop.
    if (object && over.path === Path.create(id, over.item.id)) {
      stack.sections.splice(over.position!, 0, create(SectionType, { object }));
    } else if (object && over.path === id) {
      stack.sections.push(create(SectionType, { object }));
    }
  };

  const handleDelete = (path: string) => {
    const index = stack.sections.filter(nonNullable).findIndex((section) => section.id === Path.last(path));
    if (index >= 0) {
      stack.sections.splice(index, 1);
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
        subject: { path, position, stack },
      },
    });
  };

  return (
    <>
      <Stack
        id={id}
        data-testid='main.stack'
        SectionContent={SectionContent}
        type={SectionType.typename}
        items={items}
        separation={separation}
        transform={handleTransform}
        onDrop={handleDrop}
        onOver={handleOver}
        onDeleteSection={handleDelete}
        onNavigateToSection={handleNavigate}
        onAddSection={handleAddSection}
        collapsedSections={collapsedSections}
        onChangeCollapsedSections={onChangeCollapsedSections}
      />

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
                subject: { position: 'afterAll', stack },
              },
            })
          }
        >
          <Plus />
          <span className='sr-only'>{t('add section label')}</span>
        </Button>
      </div>
    </>
  );
};

export default StackMain;
