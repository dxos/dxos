//
// Copyright 2023 DXOS.org
//

import { Plus, Placeholder } from '@phosphor-icons/react';
import React, { type FC, forwardRef, type Ref } from 'react';

import { useIntent } from '@braneframe/plugin-intent';
import { type Stack as StackType, type File as FileType } from '@braneframe/types';
import { Main, Button, useTranslation, DropdownMenu, ButtonGroup } from '@dxos/aurora';
import { type DelegatorProps } from '@dxos/aurora-grid';
import { Stack, type StackSectionItem } from '@dxos/aurora-stack';
import { baseSurface, chromeSurface, coarseBlockPaddingStart, getSize, surfaceElevation } from '@dxos/aurora-theme';
import { Surface, usePlugin } from '@dxos/react-surface';

import { FileUpload } from './FileUpload';
import { StackSection } from './StackSection';
import { StackSections } from './StackSections';
import { defaultFileTypes } from '../hooks';
import { STACK_PLUGIN, type StackPluginProvides } from '../types';

export const StackSectionDelegator = forwardRef<HTMLElement, { data: DelegatorProps }>(
  ({ data: props }, forwardedRef) => {
    switch (props.tile.variant) {
      case 'stack':
        return <StackSections {...props} ref={forwardedRef as Ref<HTMLDivElement>} />;
      case 'card':
        return <StackSection {...props} ref={forwardedRef as Ref<HTMLLIElement>} />;
      default:
        return null;
    }
  },
);

const StackContent = ({ data }: { data: StackSectionItem }) => {
  return <Surface role='section' data={data} />;
};

export const StackMain: FC<{ data: StackType }> = ({ data: stack }) => {
  const { t } = useTranslation(STACK_PLUGIN);
  const { dispatch } = useIntent();
  const stackPlugin = usePlugin<StackPluginProvides>(STACK_PLUGIN);

  // const handleAdd = useCallback(
  //   (sectionObject: StackType['sections'][0]['object']) => {
  //     stack.sections.splice(stack.sections.length, 0, {
  //       id: sectionObject.id,
  //       index: stack.sections.length > 0 ? getIndexAbove(stack.sections[stack.sections.length - 1].index) : 'a0',
  //       object: sectionObject,
  //     });
  //   },
  //   [stack, stack.sections],
  // );

  const items = stack.sections.map(({ object }) => object);

  return (
    <Main.Content bounce classNames={[baseSurface, coarseBlockPaddingStart]}>
      <Stack id={STACK_PLUGIN} Component={StackContent} items={items} />

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
