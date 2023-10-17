//
// Copyright 2023 DXOS.org
//

import { Plus, Placeholder } from '@phosphor-icons/react';
import React, { useCallback, type FC } from 'react';

import { useIntent } from '@braneframe/plugin-intent';
import { type Stack as StackType, type File as FileType } from '@braneframe/types';
import { Main, Button, useTranslation, DropdownMenu, ButtonGroup } from '@dxos/aurora';
import { Path, type MosaicDropEvent, type MosaicMoveEvent } from '@dxos/aurora-grid/next';
import { Stack, type StackSectionItem } from '@dxos/aurora-stack';
import { baseSurface, chromeSurface, coarseBlockPaddingStart, getSize, surfaceElevation } from '@dxos/aurora-theme';
import { TypedObject } from '@dxos/react-client/echo';
import { Surface, usePlugin } from '@dxos/react-surface';

import { FileUpload } from './FileUpload';
import { defaultFileTypes } from '../hooks';
import { STACK_PLUGIN, type StackPluginProvides } from '../types';

const StackContent = ({ data }: { data: StackSectionItem }) => {
  return <Surface role='section' data={data} />;
};

export const StackMain: FC<{ data: StackType }> = ({ data: stack }) => {
  const { t } = useTranslation(STACK_PLUGIN);
  const { dispatch } = useIntent();
  const stackPlugin = usePlugin<StackPluginProvides>(STACK_PLUGIN);

  const items = stack.sections.map(({ object }) => object as TypedObject<StackSectionItem>);

  const handleOver = ({ active }: MosaicMoveEvent<number>) => {
    const exists = items.findIndex(({ id }) => id === active.item.id) >= 0;
    if (!exists) {
      return 'copy';
    } else {
      return 'reject';
    }
  };

  const handleDrop = ({ operation, active, over }: MosaicDropEvent<number>) => {
    if (
      (active.path === Path.create(stack.id, active.item.id) || active.path === stack.id) &&
      (operation !== 'copy' || over.path === Path.create(stack.id, over.item.id) || over.path === stack.id)
    ) {
      stack.sections.splice(active.position!, 1);
    }

    if (over.path === Path.create(stack.id, over.item.id)) {
      stack.sections.splice(over.position!, 0, new TypedObject({ object: active.item as TypedObject }));
    } else if (over.path === stack.id) {
      stack.sections.push(new TypedObject({ object: active.item as TypedObject }));
    }
  };

  const handleRemove = (path: string) => {
    const index = stack.sections.findIndex(({ object }) => object.id === Path.last(path));
    if (index >= 0) {
      stack.sections.splice(index, 1);
    }
  };

  const handleAdd = useCallback(
    (sectionObject: StackType['sections'][0]['object']) => {
      stack.sections.push(
        new TypedObject({
          id: sectionObject.id,
          object: sectionObject,
        }),
      );
    },
    [stack, stack.sections],
  );

  return (
    <Main.Content bounce classNames={[baseSurface, coarseBlockPaddingStart]}>
      <Stack
        id={`stack-${stack.id}`}
        Component={StackContent}
        items={items}
        onOver={handleOver}
        onDrop={handleDrop}
        onRemoveSection={handleRemove}
      />

      <div role='none' className='flex gap-4 justify-center items-center pbe-4'>
        <ButtonGroup classNames={[surfaceElevation({ elevation: 'group' }), chromeSurface]}>
          <DropdownMenu.Root modal={false}>
            <DropdownMenu.Trigger asChild>
              <Button variant='ghost'>
                <Plus className={getSize(5)} />
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
                        const { object: nextSection } = await dispatch(intent);
                        handleAdd(nextSection);
                      }}
                    >
                      <Icon className={getSize(4)} />
                      <span>{typeof label === 'string' ? label : t(...(label as [string, { ns: string }]))}</span>
                    </DropdownMenu.Item>
                  );
                })}
              </DropdownMenu.Viewport>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
          <FileUpload
            classNames='p-2'
            fileTypes={[...defaultFileTypes.images, ...defaultFileTypes.media, ...defaultFileTypes.text]}
            onUpload={(file: FileType) => {
              handleAdd(file);
            }}
          />
        </ButtonGroup>
      </div>
    </Main.Content>
  );
};
