//
// Copyright 2023 DXOS.org
//

import { Plus, Placeholder } from '@phosphor-icons/react';
import React, { FC, useCallback } from 'react';

import { useIntent } from '@braneframe/plugin-intent';
import { Main, Input, Button, useTranslation, DropdownMenu, ButtonGroup } from '@dxos/aurora';
import { blockSeparator, chromeSurface, getSize, mx, surfaceElevation } from '@dxos/aurora-theme';
import { Space } from '@dxos/client/echo';

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

export const StackMain: FC<{ data: { space: Space; object: StackModel & StackProperties } }> = ({
  data: { space, object },
}) => {
  const stack = object as StackModel & StackProperties;
  return <StackMainImpl stack={stack} />;
};

const StackMainImpl: FC<{ stack: StackModel & StackProperties }> = ({ stack }) => {
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
      </div>
    </Main.Content>
  );
};
