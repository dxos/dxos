//
// Copyright 2023 DXOS.org
//

import { DragEndEvent, DragOverEvent, DragStartEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import get from 'lodash.get';
import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';

import { useDnd, useDragEnd, useDragOver, useDragStart } from '@braneframe/plugin-dnd';
import { File as FileType } from '@braneframe/types';
import { List, useTranslation } from '@dxos/aurora';
import { textBlockWidth } from '@dxos/aurora-theme';
import { arrayMove } from '@dxos/util';

import { FileUpload } from './FileUpload';
import { StackSection } from './StackSection';
import { defaultFileTypes } from '../hooks';
import { stackState } from '../stores';
import { GenericStackObject, getSectionModels, STACK_PLUGIN, StackSectionModel, StackSections } from '../types';

export const StackSectionsSortable: FC<{
  sections: StackSections;
  id: string;
  onAdd: (sectionObject: GenericStackObject, start: number) => StackSectionModel[];
  persistenceId?: string;
  StackSectionComponent?: typeof StackSection;
}> = ({ sections, id: stackId, onAdd, persistenceId, StackSectionComponent = StackSection }) => {
  const { t } = useTranslation(STACK_PLUGIN);
  const dnd = useDnd();
  const [sectionModels, setSectionModels] = useState(getSectionModels(sections));
  const sectionIds = useMemo(() => new Set(Array.from(sectionModels).map(({ object: { id } }) => id)), [sectionModels]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeAddableObject, setActiveAddableObject] = useState<GenericStackObject | null>(null);
  const [overIsMember, setOverIsMember] = useState(false);

  const { setNodeRef: useDroppableNodeRef } = useDroppable({ id: stackId, data: { stack: { id: stackId } } });

  useEffect(() => setSectionModels(getSectionModels(sections)), [sections, stackId]);

  useDragStart(
    ({ active: { data } }: DragStartEvent) => {
      const nextActiveId = get(data.current, 'section.object.id', null);
      if (nextActiveId) {
        setActiveId(nextActiveId);
        setActiveAddableObject(null);
      } else {
        const chooserData = get(data.current, 'treeitem.data', null);
        const validChooser = chooserData && stackState.choosers?.find((chooser) => chooser?.filter(chooserData));
        setActiveAddableObject(validChooser && !sectionIds.has(get(chooserData, 'id')) ? chooserData : null);
      }
    },
    [sectionIds],
  );

  useDragOver(
    ({ over }: DragOverEvent) => {
      if (!over) {
        setOverIsMember(false);
      } else {
        const overSectionId = get(over, 'data.current.section.object.id', null);
        const overStackId = get(over, 'data.current.stack.id', null);
        const overIndex =
          overStackId && !overSectionId
            ? sections.length
            : sections.findIndex((section) => section?.object?.id === overSectionId);
        setOverIsMember(overIndex >= 0);
        if (activeAddableObject) {
          setSectionModels((sectionModels) => {
            if (overIndex >= 0) {
              const persistedObjects = getSectionModels(sections);
              return [
                ...persistedObjects.slice(0, overIndex),
                { id: activeAddableObject.id, object: activeAddableObject, isPreview: true },
                ...persistedObjects.slice(overIndex, persistedObjects.length),
              ];
            } else if (overSectionId !== activeAddableObject.id && sectionModels.length !== sections.length) {
              return getSectionModels(sections);
            } else {
              return sectionModels;
            }
          });
        }
      }
    },
    [sections, activeAddableObject],
  );

  const handleRemove = useCallback(
    (start: number) => {
      sections.splice(start, 1);
      setSectionModels(getSectionModels(sections));
    },
    [sections],
  );

  useDragEnd(
    ({ active, over }: DragEndEvent) => {
      const activeModelIndex = sectionModels.findIndex(({ id }) => id === activeAddableObject?.id);
      if (activeModelIndex >= 0) {
        dnd.overlayDropAnimation = 'into';
        setSectionModels(onAdd(activeAddableObject!, activeModelIndex));
      } else if (overIsMember) {
        const overSectionId = get(over, 'data.current.section.object.id');
        const activeSectionId = get(active, 'data.current.section.object.id', null);
        const nextIndex = sections.findIndex((section) => section?.object?.id === over?.id);
        if (activeSectionId) {
          dnd.overlayDropAnimation = 'around';
          if (activeSectionId !== overSectionId) {
            const activeIndex = sections.findIndex((section) => section?.object?.id === active.id);
            arrayMove(sections, activeIndex, nextIndex);
            setSectionModels(getSectionModels(sections));
          }
        }
      } else {
        setSectionModels(getSectionModels(sections));
      }
      setActiveId(null);
      setActiveAddableObject(null);
      setOverIsMember(false);
    },
    [sections, overIsMember, activeAddableObject, sectionModels],
  );

  return (
    <List variant='ordered' itemSizes='many' classNames={[textBlockWidth, 'pli-2']}>
      <SortableContext items={sectionModels} strategy={verticalListSortingStrategy}>
        {sectionModels.map((sectionModel, start) => {
          return (
            <StackSectionComponent
              key={sectionModel.id}
              onRemove={() => handleRemove(start)}
              section={sectionModel}
              rearranging={overIsMember && activeId === sectionModel.id}
              persistenceId={persistenceId}
            />
          );
        })}
      </SortableContext>
      <div role='none' ref={useDroppableNodeRef}>
        {sectionModels.length < 1 && (
          <p className='text-center mlb-1 plb-4 border border-dashed border-neutral-500/50 rounded'>
            {t('empty stack message')}
          </p>
        )}
      </div>
      <FileUpload
        classNames='p-2'
        fileTypes={[...defaultFileTypes.images, ...defaultFileTypes.media, ...defaultFileTypes.text]}
        onUpload={(file: FileType) => {
          setSectionModels(onAdd(file, sectionModels.length));
        }}
      />
    </List>
  );
};
