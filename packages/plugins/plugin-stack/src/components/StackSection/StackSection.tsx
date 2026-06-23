//
// Copyright 2024 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { Paths } from '@dxos/app-toolkit';
import { AppSurface, AttentionSigilButton } from '@dxos/app-toolkit/ui';
import { DropdownMenu, Icon, IconButton, useTranslation } from '@dxos/react-ui';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { type MosaicTileProps } from '@dxos/react-ui-mosaic';
import { getSize, mx } from '@dxos/ui-theme';

import { meta } from '#meta';
import { type StackSectionItem } from '#types';

import { useStack } from '../StackContext';
import { StackTile } from '../StackTile';
import { CaretDownUp } from './CaretDownUp';

const sectionActionDimensions = 'p-1 my-1 shrink-0 min-h-0 w-(--dx-rail-action) h-min';

export type StackSectionProps = MosaicTileProps<StackSectionItem>;

/**
 * A stack section rendered as a Mosaic tile: the left rail holds the section menu and
 * expand/navigate controls; the main area renders the section's content surface (or its title
 * when collapsed).
 */
export const StackSection = ({ data: item, ...tileProps }: StackSectionProps) => {
  const {
    id,
    view,
    object,
    metadata: { icon = 'ph--circle-dashed--regular' },
  } = item;
  const { t } = useTranslation(meta.profile.key);
  const { attendableId: parentAttendableId, onNavigate, onAdd, onCollapse, onDelete } = useStack();
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const attendableId = Paths.getCollectionObjectPath(parentAttendableId, object.id);
  const attentionAttrs = useAttentionAttributes(attendableId);
  const surfaceData = useMemo(() => ({ attendableId, subject: object }), [object, attendableId]);

  const rail = (
    <>
      <DropdownMenu.Root open={optionsMenuOpen} onOpenChange={setOptionsMenuOpen}>
        <DropdownMenu.Trigger asChild>
          <AttentionSigilButton attendableId={attendableId}>
            <Icon icon={icon} classNames='transition-opacity' />
          </AttentionSigilButton>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content>
            <DropdownMenu.Viewport>
              {view.collapsed ? (
                <DropdownMenu.Item onClick={() => onNavigate(id)} data-testid='section.navigate-to'>
                  <Icon icon='ph--arrow-right--regular' />
                  <span className='ms-2 grow'>{t('navigate-to-section.label')}</span>
                </DropdownMenu.Item>
              ) : (
                <DropdownMenu.Item onClick={() => onCollapse(id, true)}>
                  <CaretDownUp className={getSize(5)} />
                  <span className='ms-2 grow'>{t('collapse.label')}</span>
                </DropdownMenu.Item>
              )}
              <DropdownMenu.Item onClick={() => onAdd(id, 'before')} data-testid='section.add-before'>
                <Icon icon='ph--arrow-line-up--regular' />
                <span className='ms-2 grow'>{t('add-section-before.label')}</span>
              </DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => onAdd(id, 'after')} data-testid='section.add-after'>
                <Icon icon='ph--arrow-line-down--regular' />
                <span className='ms-2 grow'>{t('add-section-after.label')}</span>
              </DropdownMenu.Item>
              <DropdownMenu.Item onClick={() => onDelete(id)} data-testid='section.remove'>
                <Icon icon='ph--trash--regular' />
                <span className='ms-2 grow'>{t('remove-section.label')}</span>
              </DropdownMenu.Item>
            </DropdownMenu.Viewport>
            <DropdownMenu.Arrow />
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      {view.collapsed ? (
        <IconButton
          iconOnly
          variant='ghost'
          onClick={() => onCollapse(id, false)}
          label={t('expand.label')}
          icon='ph--caret-up-down--regular'
          classNames={sectionActionDimensions}
        />
      ) : (
        <IconButton
          iconOnly
          variant='ghost'
          onClick={() => onNavigate(id)}
          label={t('navigate-to-section.label')}
          icon='ph--arrow-right--regular'
          data-testid='section.navigate-to'
          classNames={sectionActionDimensions}
        />
      )}
    </>
  );

  return (
    <StackTile {...tileProps} data={item} rail={rail}>
      <div {...attentionAttrs} className='min-w-0'>
        <span className='sr-only'>{view.title}</span>
        {view.collapsed ? (
          <h2 className={mx('flex items-center p-4 font-medium')}>{view.title}</h2>
        ) : (
          <Surface.Surface type={AppSurface.Section} data={surfaceData} limit={1} placeholder={<></>} />
        )}
      </div>
    </StackTile>
  );
};
