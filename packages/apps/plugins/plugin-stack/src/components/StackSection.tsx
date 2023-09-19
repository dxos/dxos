//
// Copyright 2023 DXOS.org
//

import { DotsSixVertical, X } from '@phosphor-icons/react';
import get from 'lodash.get';
import React, { forwardRef, ForwardRefExoticComponent, RefAttributes } from 'react';

import { Graph } from '@braneframe/plugin-graph';
import { ListItem, Button, useTranslation, DensityProvider, ListScopedProps } from '@dxos/aurora';
import { DelegatorProps, getDndId, parseDndId, useMosaic } from '@dxos/aurora-grid';
import {
  fineButtonDimensions,
  focusRing,
  getSize,
  mx,
  inputSurface,
  surfaceElevation,
  hoverableControls,
  staticHoverableControls,
  hoverableControlItem,
  hoverableFocusedControls,
  hoverableFocusedKeyboardControls,
} from '@dxos/aurora-theme';
import { Surface } from '@dxos/react-surface';

import { STACK_PLUGIN, StackModel } from '../types';
import { isStack } from '../util';

type StackSectionProps = DelegatorProps<Graph.Node<StackModel>>;

export const StackSection: ForwardRefExoticComponent<StackSectionProps & RefAttributes<HTMLLIElement>> = forwardRef<
  HTMLLIElement,
  ListScopedProps<StackSectionProps>
>(
  (
    { data: { data }, tile, dragHandleAttributes, dragHandleListeners, style, isActive, isOverlay, isPreview },
    forwardedRef,
  ) => {
    const { mosaic } = useMosaic();
    const [_, stackId, entityId] = parseDndId(tile.id);
    const isSection = isStack(data);
    const sectionIndex = isSection ? data.sections?.findIndex((section) => section?.object.id === entityId) ?? -1 : -1;
    const object = isSection ? data.sections?.[sectionIndex]?.object : data;
    const { t } = useTranslation(STACK_PLUGIN);
    const handleRemove = () => {
      if (isSection) {
        delete mosaic.tiles[tile.id];
        delete mosaic.relations[tile.id];
        mosaic.relations[getDndId(STACK_PLUGIN, stackId)]?.child.delete(tile.id);
        data.sections.splice(sectionIndex, 1);
      }
    };
    if (!object) {
      return null;
    }
    return (
      <DensityProvider density='fine'>
        <ListItem.Root
          id={tile.id}
          classNames={[
            surfaceElevation({ elevation: 'group' }),
            inputSurface,
            hoverableControls,
            'grow rounded',
            isOverlay && staticHoverableControls,
            isPreview ? 'opacity-50' : isActive ? 'opacity-0' : 'opacity-100',
          ]}
          ref={forwardedRef}
          style={style}
        >
          <ListItem.Heading classNames='sr-only'>{get(object, 'title', t('generic section heading'))}</ListItem.Heading>
          <div
            className={mx(
              fineButtonDimensions,
              focusRing,
              hoverableFocusedKeyboardControls,
              'self-stretch flex items-center rounded-is justify-center bs-auto is-auto',
              isPreview ? 'invisible' : isOverlay && 'text-primary-600 dark:text-primary-300',
            )}
            {...dragHandleAttributes}
            {...dragHandleListeners}
          >
            <DotsSixVertical
              weight={isOverlay ? 'bold' : 'regular'}
              className={mx(getSize(5), hoverableControlItem, 'transition-opacity')}
            />
          </div>
          <div role='none' className='flex-1'>
            <Surface role='section' data={object} />
          </div>
          <Button
            variant='ghost'
            classNames={[
              'self-stretch justify-start rounded-is-none',
              hoverableFocusedControls,
              isPreview && 'invisible',
            ]}
            onClick={handleRemove}
          >
            <span className='sr-only'>{t('remove section label')}</span>
            <X className={mx(getSize(4), hoverableControlItem, 'transition-opacity')} />
          </Button>
        </ListItem.Root>
      </DensityProvider>
    );
  },
);
