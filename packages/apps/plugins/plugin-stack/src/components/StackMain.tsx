//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React, { useCallback, type FC, useState } from 'react';

import { FileType, StackType, SectionType, FolderType } from '@braneframe/types';
import {
  LayoutAction,
  NavigationAction,
  Surface,
  defaultFileTypes,
  parseMetadataResolverPlugin,
  parseFileManagerPlugin,
  useIntent,
  useResolvePlugin,
} from '@dxos/app-framework';
import * as E from '@dxos/echo-schema';
import { getSpaceForObject, isTypedObject, useQuery } from '@dxos/react-client/echo';
import { Main, Button, ButtonGroup } from '@dxos/react-ui';
import { Path, type MosaicDropEvent, type MosaicMoveEvent, type MosaicDataItem } from '@dxos/react-ui-mosaic';
import { Stack, type StackProps, type CollapsedSections, type AddSectionPosition } from '@dxos/react-ui-stack';
import {
  baseSurface,
  topbarBlockPaddingStart,
  getSize,
  surfaceElevation,
  staticDefaultButtonColors,
} from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

import { FileUpload } from './FileUpload';
import { STACK_PLUGIN } from '../meta';

const SectionContent: StackProps['SectionContent'] = ({ data }) => {
  // TODO(wittjosiah): Better section placeholder.
  return <Surface role='section' data={{ object: data }} placeholder={<></>} />;
};

const StackMain: FC<{ stack: StackType; separation?: boolean }> = ({ stack, separation }) => {
  const { dispatch } = useIntent();
  const metadataPlugin = useResolvePlugin(parseMetadataResolverPlugin);
  const fileManagerPlugin = useResolvePlugin(parseFileManagerPlugin);

  const id = `stack-${stack.id}`;
  const items = stack.sections
    .filter(nonNullable)
    // TODO(wittjosiah): Should the database handle this differently?
    // TODO(wittjosiah): Render placeholders for missing objects so they can be removed from the stack?
    .filter(({ object }) => object)
    .map(({ id, object }) => {
      const rest = metadataPlugin?.provides.metadata.resolver(E.typeOf(object!)?.itemId ?? 'never');
      return { id, object: object as SectionType, ...rest };
    });
  const space = getSpaceForObject(stack);
  const [folder] = useQuery(space, E.Filter.schema(FolderType));

  const [collapsedSections, onChangeCollapsedSections] = useState<CollapsedSections>({});

  const handleOver = ({ active }: MosaicMoveEvent<number>) => {
    const parseData = metadataPlugin?.provides.metadata.resolver(active.type)?.parse;
    const data = parseData ? parseData(active.item, 'object') : active.item;

    // TODO(wittjosiah): Prevent dropping items which don't have a section renderer?
    //  Perhaps stack plugin should just provide a fallback section renderer.
    if (!(isTypedObject(data) || E.isReactiveProxy(data)) || data instanceof StackType) {
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
      stack.sections.splice(over.position!, 0, E.object(SectionType, { object }));
    } else if (object && over.path === id) {
      stack.sections.push(E.object(SectionType, { object }));
    }
  };

  const handleDelete = (path: string) => {
    const index = stack.sections.filter(nonNullable).findIndex((section) => section.id === Path.last(path));
    if (index >= 0) {
      stack.sections.splice(index, 1);
    }
  };

  const handleAdd = useCallback(
    (sectionObject: SectionType['object']) => {
      stack.sections.push(E.object(SectionType, { object: sectionObject }));
      // TODO(wittjosiah): Remove once stack items can be added to folders separately.
      folder?.objects.push(sectionObject);
    },
    [stack, stack.sections],
  );

  // TODO(wittjosiah): Factor out.
  const handleFileUpload = fileManagerPlugin?.provides.file.upload
    ? async (file: File) => {
        const filename = file.name.split('.')[0];
        const info = await fileManagerPlugin.provides.file.upload?.(file);
        if (info) {
          const obj = E.object(FileType, { type: file.type, title: filename, filename, cid: info.cid });
          handleAdd(obj);
        }
      }
    : undefined;

  const handleNavigate = async (id: string) => {
    await dispatch({
      action: NavigationAction.ACTIVATE,
      data: { id },
    });
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
    <Main.Content classNames={[baseSurface, topbarBlockPaddingStart]}>
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

      <div role='none' className='flex justify-center mbs-4 pbe-4'>
        <ButtonGroup classNames={[surfaceElevation({ elevation: 'group' }), staticDefaultButtonColors]}>
          <Button
            variant='ghost'
            data-testid='stack.createSection'
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
            <Plus className={getSize(6)} />
          </Button>
          {handleFileUpload && (
            <FileUpload
              fileTypes={[...defaultFileTypes.images, ...defaultFileTypes.media, ...defaultFileTypes.text]}
              onUpload={handleFileUpload}
            />
          )}
        </ButtonGroup>
      </div>
    </Main.Content>
  );
};

export default StackMain;
