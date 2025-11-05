//
// Copyright 2024 DXOS.org
//

import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import React, { useMemo, useState } from 'react';

import { Surface } from '@dxos/app-framework/react';
import { DropdownMenu, Icon, IconButton, useTranslation } from '@dxos/react-ui';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { StackItem } from '@dxos/react-ui-stack';
import { getSize, mx, textBlockWidth } from '@dxos/react-ui-theme';

import { meta } from '../meta';
import { type StackSectionItem } from '../types';

import { CaretDownUp } from './CaretDownUp';
import { useStack } from './StackContext';

const sectionActionDimensions = 'p-1 mlb-1 shrink-0 min-bs-0 is-[--rail-action] bs-min';

export type StackSectionProps = StackSectionItem;

export const StackSection = ({
  id,
  view,
  object,
  metadata: { icon = 'ph--placeholder--regular' },
}: StackSectionProps) => {
  const { t } = useTranslation(meta.id);
  const { onNavigate, onAdd, onCollapse, onDelete } = useStack();
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const attentionAttrs = useAttentionAttributes(id);
  const stackItem = useMemo(() => ({ id }), [id]);

  return (
    <CollapsiblePrimitive.Root asChild open={!view.collapsed} onOpenChange={(nextOpen) => onCollapse?.(id, !nextOpen)}>
      <StackItem.Root item={stackItem} role='section' {...attentionAttrs}>
        <StackItem.Heading classNames='attention-surface'>
          <span className='sr-only'>{view.title}</span>
          <StackItem.HeadingStickyContent>
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
                <DropdownMenu.Content>
                  <DropdownMenu.Viewport>
                    {view.collapsed ? (
                      <DropdownMenu.Item onClick={() => onNavigate(id)} data-testid='section.navigate-to'>
                        <Icon icon='ph--arrow-right--regular' size={5} />
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
                  variant='ghost'
                  label={t('expand label')}
                  icon='ph--caret-up-down--regular'
                  classNames={sectionActionDimensions}
                />
              </CollapsiblePrimitive.Trigger>
            ) : (
              <IconButton
                iconOnly
                variant='ghost'
                onClick={() => onNavigate(id)}
                label={t('navigate to section label')}
                icon='ph--arrow-right--regular'
                data-testid='section.navigate-to'
                classNames={sectionActionDimensions}
              />
            )}
          </StackItem.HeadingStickyContent>
        </StackItem.Heading>
        <CollapsiblePrimitive.Content>
          <Surface role='section' data={{ subject: object }} limit={1} placeholder={<></>} />
        </CollapsiblePrimitive.Content>
        {view.collapsed && (
          <StackItem.Content classNames='attention-surface'>
            <h2 className={mx('flex items-center p-4 font-medium', textBlockWidth)}>{view.title}</h2>
          </StackItem.Content>
        )}
      </StackItem.Root>
    </CollapsiblePrimitive.Root>
  );
};
