//
// Copyright 2023 DXOS.org
//

import { DotsSixVertical, X } from '@phosphor-icons/react';
import get from 'lodash.get';
import React, { FC, forwardRef } from 'react';

import { SortableProps } from '@braneframe/plugin-dnd';
import { useGraph } from '@braneframe/plugin-graph';
import { getPersistenceParent } from '@braneframe/plugin-treeview';
import { List, ListItem, Button, useTranslation, DensityProvider, ListScopedProps } from '@dxos/aurora';
import { useSortable, CSS } from '@dxos/aurora-grid';
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
  descriptionText,
} from '@dxos/aurora-theme';
import { Surface } from '@dxos/react-surface';

import { STACK_PLUGIN, StackSectionModel } from '../types';

export const StackSectionOverlay: FC<{ data: StackSectionModel }> = ({ data }) => {
  return (
    <List variant='ordered'>
      <StackSectionImpl section={data} isOverlay />
    </List>
  );
};

type StackSectionProps = {
  onRemove?: () => void;
  section: StackSectionModel;
};

const StackSectionImpl = forwardRef<HTMLLIElement, ListScopedProps<StackSectionProps> & SortableProps>(
  (
    { onRemove = () => {}, section, draggableAttributes, draggableListeners, style, rearranging, isOverlay },
    forwardedRef,
  ) => {
    const { t } = useTranslation(STACK_PLUGIN);
    return (
      <DensityProvider density='fine'>
        <ListItem.Root
          id={section.object.id}
          classNames={[
            surfaceElevation({ elevation: 'group' }),
            inputSurface,
            hoverableControls,
            'grow rounded mlb-2',
            isOverlay && staticHoverableControls,
            rearranging ? 'opacity-0' : section.isPreview ? 'opacity-50' : 'opacity-100',
          ]}
          ref={forwardedRef}
          style={style}
        >
          <ListItem.Heading classNames='sr-only'>
            {get(section, 'object.title', t('generic section heading'))}
          </ListItem.Heading>
          <div
            className={mx(
              fineButtonDimensions,
              focusRing,
              hoverableFocusedKeyboardControls,
              'self-stretch flex items-center rounded-is justify-center bs-auto is-auto',
              isOverlay && 'text-primary-600 dark:text-primary-300',
            )}
            {...draggableAttributes}
            {...draggableListeners}
          >
            <DotsSixVertical
              weight={isOverlay ? 'bold' : 'regular'}
              className={mx(getSize(5), hoverableControlItem, 'transition-opacity')}
            />
          </div>
          <div role='none' className='flex-1'>
            <Surface role='section' data={section.object} />
          </div>
          <Button
            variant='ghost'
            classNames={['self-stretch justify-start rounded-is-none', hoverableFocusedControls]}
            onClick={onRemove}
          >
            <span className='sr-only'>{t('remove section label')}</span>
            <X className={mx(getSize(4), hoverableControlItem, 'transition-opacity')} />
          </Button>
        </ListItem.Root>
      </DensityProvider>
    );
  },
);

export const StackSectionSortable: FC<ListScopedProps<StackSectionProps> & { rearranging?: boolean }> = (props) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: props.section.id,
    data: { section: props.section, dragoverlay: props.section },
  });
  return (
    <StackSectionImpl
      {...props}
      draggableListeners={listeners}
      draggableAttributes={attributes}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      ref={setNodeRef}
    />
  );
};

const StackSectionTombstone = () => {
  const { t } = useTranslation(STACK_PLUGIN);
  return <p className={mx(descriptionText, 'text-center plb-2')}>{t('stack section deleted label')}</p>;
};

export const StackSection = ({
  persistenceId,
  ...props
}: StackSectionProps & { rearranging?: boolean; persistenceId?: string }) => {
  const { graph } = useGraph();
  const node = props.section?.object?.id ? graph.find(props.section.object.id) : undefined;
  const persistenceParent = node ? getPersistenceParent(node, node.properties?.persistenceClass) : null;
  return persistenceId === persistenceParent?.id ? <StackSectionSortable {...props} /> : <StackSectionTombstone />;
};
