//
// Copyright 2023 DXOS.org
//

import { Plus, Placeholder } from '@phosphor-icons/react';
import { getIndexAbove } from '@tldraw/indices';
import { DeepSignal } from 'deepsignal';
import React, { FC, forwardRef, Ref, useCallback, useEffect } from 'react';

import { useIntent } from '@braneframe/plugin-intent';
import { File as FileType } from '@braneframe/types';
import { Main, Button, useTranslation, DropdownMenu, ButtonGroup } from '@dxos/aurora';
import { Mosaic, DelegatorProps, MosaicState, getDndId, useMosaic, TileProps } from '@dxos/aurora-grid';
import { baseSurface, chromeSurface, coarseBlockPaddingStart, getSize, surfaceElevation } from '@dxos/aurora-theme';

import { FileUpload } from './FileUpload';
import { StackSection } from './StackSection';
import { StackSections } from './StackSections';
import { defaultFileTypes } from '../hooks';
import { stackState } from '../stores';
import { STACK_PLUGIN, StackModel, StackProperties } from '../types';

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

export const StackMain: FC<{ data: StackModel & StackProperties }> = ({ data: stack }) => {
  const { t } = useTranslation(STACK_PLUGIN);
  const { dispatch } = useIntent();
  const { mosaic } = useMosaic();
  const handleAdd = useCallback(
    (sectionObject: StackModel['sections'][0]['object']) => {
      stack.sections.splice(stack.sections.length, 0, {
        id: sectionObject.id,
        index: stack.sections.length > 0 ? getIndexAbove(stack.sections[stack.sections.length - 1].index) : 'a0',
        object: sectionObject,
      });
    },
    [stack, stack.sections],
  );

  const rootTile: TileProps = {
    id: getDndId(STACK_PLUGIN, stack.id),
    sortable: true,
    acceptCopyClass: 'stack-section',
    index: 'a0',
    variant: 'stack',
  };

  useEffect(() => {
    const tiles = stack.sections.reduce(
      (acc: MosaicState['tiles'], section) => {
        const id = getDndId(STACK_PLUGIN, stack.id, section.id);
        acc[id] = {
          id,
          variant: 'card',
          index: section.index,
        };
        return acc;
      },
      { [rootTile.id]: rootTile },
    );

    const relations = Object.keys(tiles).reduce((acc: MosaicState['relations'], id) => {
      acc[id] = { child: new Set(), parent: new Set() };
      if (id === rootTile.id) {
        Object.keys(tiles)
          .filter((id) => id !== rootTile.id)
          .forEach((childId) => {
            acc[id].child.add(childId);
          });
      } else {
        acc[id].parent.add(rootTile.id);
      }
      return acc;
    }, {});

    mosaic.tiles = { ...mosaic.tiles, ...tiles } as DeepSignal<MosaicState['tiles']>;
    mosaic.relations = { ...mosaic.relations, ...relations } as DeepSignal<MosaicState['relations']>;
  }, [stack, stack.sections]);

  return (
    <Main.Content bounce classNames={[baseSurface, coarseBlockPaddingStart]}>
      <Mosaic.Root id={STACK_PLUGIN}>
        <Mosaic.Tile {...rootTile} />
      </Mosaic.Root>

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
                {stackState.creators?.map(({ id, testId, intent, icon, label }) => {
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
