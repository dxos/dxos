//
// Copyright 2024 DXOS.org
//

import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import React, { useState } from 'react';

import { Surface } from '@dxos/app-framework';
import { DropdownMenu, Icon, useTranslation, IconButton } from '@dxos/react-ui';
import { useAttendableAttributes } from '@dxos/react-ui-attention';
import { StackItem } from '@dxos/react-ui-stack';
import { mx, getSize, textBlockWidth } from '@dxos/react-ui-theme';

import { CaretDownUp } from './CaretDownUp';
import { useStack } from './StackContext';
import { STACK_PLUGIN } from '../meta';
import { type StackSectionItem } from '../types';

const sectionActionDimensions = 'm-1 p-1 shrink-0 min-bs-0 is-[--rail-action] bs-min';

export const StackSection = ({
  id,
  view,
  object,
  metadata: { icon = 'ph--placeholder--regular' },
}: StackSectionItem) => {
  const { t } = useTranslation(STACK_PLUGIN);
  const { onNavigate, onAdd, onCollapse, onDelete } = useStack();
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const attendableAttrs = useAttendableAttributes(id);

  return (
    <CollapsiblePrimitive.Root asChild open={!view.collapsed} onOpenChange={(nextOpen) => onCollapse?.(id, !nextOpen)}>
      <StackItem.Root item={{ id }} role='section' {...attendableAttrs}>
        <StackItem.Heading classNames='attention-surface'>
          <span className='sr-only'>{view.title}</span>
          <div role='none' className='sticky -block-start-px bg-[--sticky-bg]'>
            <DropdownMenu.Root
              {...{
                open: optionsMenuOpen,
                onOpenChange: setOptionsMenuOpen,
              }}
            >
              <DropdownMenu.Trigger asChild>
                <StackItem.SigilButton>
                  <Icon icon={icon} size={5} classNames='transition-opacity' />
                </StackItem.SigilButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content style={{ zIndex: 70 }}>
                  <DropdownMenu.Viewport>
                    {view.collapsed ? (
                      <DropdownMenu.Item onClick={() => onNavigate(id)} data-testid='section.navigate-to'>
                        <Icon icon='ph--arrow-square-out--regular' size={5} />
                        <span className='mis-2 grow'>{t('navigate to section label')}</span>
                      </DropdownMenu.Item>
                    ) : (
                      <CollapsiblePrimitive.Trigger asChild>
                        <DropdownMenu.Item>
                          <CaretDownUp className={getSize(5)} />
                          <span className='mis-2 grow'>{t('collapse label')}</span>
                        </DropdownMenu.Item>
                      </CollapsiblePrimitive.Trigger>
                    )}
                    <DropdownMenu.Item onClick={() => onAdd(id, 'before')} data-testid='section.add-before'>
                      <Icon icon='ph--arrow-line-up--regular' size={5} />
                      <span className='mis-2 grow'>{t('add section before label')}</span>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onClick={() => onAdd(id, 'after')} data-testid='section.add-after'>
                      <Icon icon='ph--arrow-line-down--regular' size={5} />
                      <span className='mis-2 grow'>{t('add section after label')}</span>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onClick={() => onDelete(id)} data-testid='section.remove'>
                      <Icon icon='ph--trash--regular' size={5} />
                      <span className='mis-2 grow'>{t('remove section label')}</span>
                    </DropdownMenu.Item>
                  </DropdownMenu.Viewport>
                  <DropdownMenu.Arrow />
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
            {view.collapsed ? (
              <CollapsiblePrimitive.Trigger asChild>
                <IconButton
                  iconOnly
                  tooltipZIndex='70'
                  variant='ghost'
                  label={t('expand label')}
                  icon='ph--caret-up-down--regular'
                  classNames={sectionActionDimensions}
                />
              </CollapsiblePrimitive.Trigger>
            ) : (
              <IconButton
                iconOnly
                tooltipZIndex='70'
                variant='ghost'
                onClick={() => onNavigate(id)}
                label={t('navigate to section label')}
                icon='ph--arrow-square-out--regular'
                data-testid='section.navigate-to'
                classNames={sectionActionDimensions}
              />
            )}
          </div>
        </StackItem.Heading>
        <CollapsiblePrimitive.Content>
          <Surface role='section' data={{ object }} limit={1} placeholder={<></>} />
        </CollapsiblePrimitive.Content>
        {view.collapsed && (
          <StackItem.Content toolbar={false} classNames='attention-surface'>
            <h2 className={mx('flex items-center p-4 font-medium is-full', textBlockWidth)}>{view.title}</h2>
          </StackItem.Content>
        )}
      </StackItem.Root>
    </CollapsiblePrimitive.Root>
  );
};
