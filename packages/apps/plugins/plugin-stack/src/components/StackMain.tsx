//
// Copyright 2023 DXOS.org
//

import { DragEndEvent, DragOverEvent, DragStartEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, Placeholder } from '@phosphor-icons/react';
import get from 'lodash.get';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useDnd, useDragEnd, useDragOver, useDragStart } from '@braneframe/plugin-dnd';
import { useIntent } from '@braneframe/plugin-intent';
import { Main, Input, List, Button, useTranslation, DropdownMenu, ButtonGroup } from '@dxos/aurora';
import { blockSeparator, chromeSurface, getSize, mx, surfaceElevation } from '@dxos/aurora-theme';
import { arrayMove } from '@dxos/util';

import { stackState } from '../stores';
import {
  GenericStackObject,
  STACK_PLUGIN,
  StackModel,
  StackProperties,
  StackSectionModel,
  StackSections,
} from '../types';
import { FileUpload } from './FileUpload';
import { StackSection } from './StackSection';

const getSectionModels = (sections: StackSections): StackSectionModel[] =>
  Array.from(sections)
    .filter((section) => section?.object?.id)
    .map(({ object }) => getSectionModel(object));

const getSectionModel = (object: GenericStackObject, isPreview?: boolean): StackSectionModel => ({
  id: object.id,
  object,
  isPreview: !!isPreview,
});

const StackSectionsImpl = ({
  sections,
  id: stackId,
  onAdd,
}: {
  sections: StackSections;
  id: string;
  onAdd: (start: number, nextSectionObject: GenericStackObject) => StackSectionModel[];
}) => {
  const { t } = useTranslation(STACK_PLUGIN);
  const dnd = useDnd();
  const [sectionModels, setSectionModels] = useState(getSectionModels(sections));
  const sectionIds = useMemo(() => new Set(Array.from(sectionModels).map(({ object: { id } }) => id)), [sectionModels]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeAddableObject, setActiveAddableObject] = useState<GenericStackObject | null>(null);
  const [overIsMember, setOverIsMember] = useState(false);

  const { setNodeRef } = useDroppable({ id: stackId, data: { stack: { id: stackId } } });

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
        setSectionModels(onAdd(activeModelIndex, activeAddableObject!));
      } else if (overIsMember) {
        const overSectionId = get(over, 'data.current.section.object.id');
        const activeSectionId = get(active, 'data.current.section.object.id', null);
        const nextIndex = sections.findIndex((section) => section.object.id === over?.id);
        if (activeSectionId) {
          dnd.overlayDropAnimation = 'around';
          if (activeSectionId !== overSectionId) {
            const activeIndex = sections.findIndex((section) => section.object.id === active.id);
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
    <List variant='ordered' itemSizes='many' classNames='pli-2'>
      <SortableContext items={sectionModels} strategy={verticalListSortingStrategy}>
        {sectionModels.map((sectionModel, start) => {
          return (
            <StackSection
              key={sectionModel.id}
              onRemove={() => handleRemove(start)}
              section={sectionModel}
              rearranging={overIsMember && activeId === sectionModel.id}
            />
          );
        })}
      </SortableContext>
      <div role='none' className='__plb-1' ref={setNodeRef}>
        {sectionModels.length < 1 && (
          <p className='text-center mlb-1 plb-4 border border-dashed border-neutral-500/50 rounded'>
            {t('empty stack message')}
          </p>
        )}
      </div>
    </List>
  );
};

const StackMainImpl = ({ stack }: { stack: StackModel & StackProperties }) => {
  const { t } = useTranslation(STACK_PLUGIN);
  const { sendIntent } = useIntent();
  const handleAdd = useCallback(
    (start: number, nextSectionObject: GenericStackObject) => {
      const nextSectionModel = getSectionModel(nextSectionObject);
      stack.sections.splice(start, 0, nextSectionModel);
      return getSectionModels(stack.sections);
    },
    [stack.sections],
  );

  return (
    <Main.Content classNames='min-bs-[100vh]' bounce>
      <div role='none' className='mli-auto max-is-[60rem]'>
        {/* TODO(burdon): Factor out header. */}
        <Input.Root>
          <Input.Label srOnly>{t('stack title label')}</Input.Label>
          <Input.TextInput
            variant='subdued'
            classNames='flex-1 min-is-0 is-auto pis-4 pointer-fine:pis-12 lg:pis-4 pointer-fine:lg:pis-4 plb-3.5 pointer-fine:plb-2.5'
            placeholder={t('stack title placeholder')}
            value={stack.title ?? ''}
            onChange={({ target: { value } }) => (stack.title = value)}
          />
        </Input.Root>
        <div role='separator' className={mx(blockSeparator, 'mli-4 opacity-50')} />

        <StackSectionsImpl sections={stack.sections} id={stack.id} onAdd={handleAdd} />

        {/* TODO(burdon): Add to menu. */}
        <FileUpload
          classNames='mb-4 p-2'
          fileTypes={['png']}
          onUpload={(file: any) => {
            console.log('upload', file);
          }}
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
                {stackState.creators?.map(({ id, testId, intent, icon, label }) => {
                  const Icon = icon ?? Placeholder;
                  return (
                    <DropdownMenu.Item
                      key={id}
                      id={id}
                      data-testid={testId}
                      onClick={async () => {
                        const { object: nextSection } = await sendIntent(intent);
                        handleAdd(stack.sections.length, nextSection);
                      }}
                    >
                      <Icon className={getSize(4)} />
                      <span>{typeof label === 'string' ? label : t(...(label as [string, { ns: string }]))}</span>
                    </DropdownMenu.Item>
                  );
                })}
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </ButtonGroup>
        </div>
      </div>
    </Main.Content>
  );
};

export const StackMain = ({ data }: { data: { object: StackModel & StackProperties } }) => {
  const stack = data.object as StackModel & StackProperties;
  return <StackMainImpl stack={stack} />;
};
