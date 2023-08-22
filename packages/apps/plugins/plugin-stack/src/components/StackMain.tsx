//
// Copyright 2023 DXOS.org
//

import { Plus, Placeholder } from '@phosphor-icons/react';
import React, { FC, useCallback } from 'react';

import { useIntent } from '@braneframe/plugin-intent';
import { Main, Button, useTranslation, DropdownMenu, ButtonGroup } from '@dxos/aurora';
import { chromeSurface, getSize, surfaceElevation } from '@dxos/aurora-theme';

import { stackState } from '../stores';
import {
  GenericStackObject,
  getSectionModel,
  getSectionModels,
  STACK_PLUGIN,
  StackModel,
  StackProperties,
} from '../types';
import { StackSectionsPanel } from './StackSectionsPanel';

export const StackMain: FC<{ data: StackModel & StackProperties }> = ({ data: stack }) => {
  const { t } = useTranslation(STACK_PLUGIN);
  const { sendIntent } = useIntent();
  const handleAdd = useCallback(
    (sectionObject: GenericStackObject, start: number) => {
      const sectionModel = getSectionModel(sectionObject);
      stack.sections.splice(start, 0, sectionModel);
      return getSectionModels(stack.sections);
    },
    [stack.sections],
  );

  return (
    <Main.Content bounce>
      <StackSectionsPanel sections={stack.sections} id={stack.id} onAdd={handleAdd} />

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
                      handleAdd(nextSection, stack.sections.length);
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
    </Main.Content>
  );
};
