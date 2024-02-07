//
// Copyright 2023 DXOS.org
//

import { Plus, Placeholder } from '@phosphor-icons/react';
import React, { useCallback, type FC } from 'react';

import { File as FileType, Stack as StackType, Folder } from '@braneframe/types';
import {
  NavigationAction,
  Surface,
  defaultFileTypes,
  parseMetadataResolverPlugin,
  parseFileManagerPlugin,
  useIntent,
  usePlugin,
  useResolvePlugin,
} from '@dxos/app-framework';
import { getSpaceForObject, isTypedObject, useQuery } from '@dxos/react-client/echo';
import { Main, Button, useTranslation, DropdownMenu, ButtonGroup } from '@dxos/react-ui';
import { Path, type MosaicDropEvent, type MosaicMoveEvent, type MosaicDataItem } from '@dxos/react-ui-mosaic';
import { Stack, type StackProps } from '@dxos/react-ui-stack';
import {
  baseSurface,
  topbarBlockPaddingStart,
  getSize,
  surfaceElevation,
  staticDefaultButtonColors,
} from '@dxos/react-ui-theme';

import { FileUpload } from './FileUpload';
import { STACK_PLUGIN } from '../meta';
import { type StackPluginProvides, isStack } from '../types';

const SectionContent: StackProps['SectionContent'] = ({ data }) => {
  // TODO(wittjosiah): Better section placeholder.
  return <Surface role='section' data={{ object: data }} placeholder={<></>} />;
};

const StackMain: FC<{ stack: StackType; separation?: boolean }> = ({ stack, separation }) => {
  const { t } = useTranslation(STACK_PLUGIN);
  const { dispatch } = useIntent();
  const stackPlugin = usePlugin<StackPluginProvides>(STACK_PLUGIN);
  const metadataPlugin = useResolvePlugin(parseMetadataResolverPlugin);
  const fileManagerPlugin = useResolvePlugin(parseFileManagerPlugin);

  const id = `stack-${stack.id}`;
  const items = stack.sections
    // TODO(wittjosiah): Should the database handle this differently?
    // TODO(wittjosiah): Render placeholders for missing objects so they can be removed from the stack?
    .filter(({ object }) => Boolean(object));
  const space = getSpaceForObject(stack);
  const [folder] = useQuery(space, Folder.filter());

  const handleOver = ({ active }: MosaicMoveEvent<number>) => {
    const parseData = metadataPlugin?.provides.metadata.resolver(active.type)?.parse;
    const data = parseData ? parseData(active.item, 'object') : active.item;

    // TODO(wittjosiah): Prevent dropping items which don't have a section renderer?
    //  Perhaps stack plugin should just provide a fallback section renderer.
    if (!isTypedObject(data) || isStack(data)) {
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
      stack.sections.splice(over.position!, 0, new StackType.Section({ object }));
    } else if (object && over.path === id) {
      stack.sections.push(new StackType.Section({ object }));
    }
  };

  const handleRemove = (path: string) => {
    const index = stack.sections.findIndex((section) => section.id === Path.last(path));
    if (index >= 0) {
      stack.sections.splice(index, 1);
    }
  };

  const handleAdd = useCallback(
    (sectionObject: StackType.Section['object']) => {
      stack.sections.push(new StackType.Section({ object: sectionObject }));
      // TODO(wittjosiah): Remove once stack items can be added to folders separately.
      folder?.objects.push(sectionObject);
    },
    [stack, stack.sections],
  );

  const handleFileUpload = fileManagerPlugin?.provides.file.upload
    ? async (file: File) => {
        const filename = file.name.split('.')[0];
        const info = await fileManagerPlugin.provides.file.upload?.(file);
        if (info) {
          handleAdd(new FileType({ type: file.type, title: filename, filename, cid: info.cid }));
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

  return (
    <Main.Content classNames={[baseSurface, topbarBlockPaddingStart]}>
      <Stack
        id={id}
        data-testid='main.stack'
        SectionContent={SectionContent}
        type={StackType.Section.schema.typename}
        items={items}
        separation={separation}
        transform={handleTransform}
        onDrop={handleDrop}
        onOver={handleOver}
        onRemoveSection={handleRemove}
        onNavigateToSection={handleNavigate}
      />

      <div role='none' className='flex justify-center mt-4'>
        <ButtonGroup classNames={[surfaceElevation({ elevation: 'group' }), staticDefaultButtonColors]}>
          <DropdownMenu.Root modal={false}>
            <DropdownMenu.Trigger asChild>
              <Button variant='ghost' data-testid='stack.createSection'>
                <Plus className={getSize(6)} />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Arrow />
              <DropdownMenu.Viewport>
                {stackPlugin?.provides?.stack.creators?.map(({ id, testId, intent, icon, label }) => {
                  const Icon = icon ?? Placeholder;
                  return (
                    <DropdownMenu.Item
                      key={id}
                      id={id}
                      data-testid={testId}
                      onClick={async () => {
                        const { data: nextSection } = (await dispatch(intent)) ?? {};
                        handleAdd(nextSection);
                      }}
                    >
                      <Icon className={getSize(6)} />
                      <span>{typeof label === 'string' ? label : t(...(label as [string, { ns: string }]))}</span>
                    </DropdownMenu.Item>
                  );
                })}
              </DropdownMenu.Viewport>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
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
