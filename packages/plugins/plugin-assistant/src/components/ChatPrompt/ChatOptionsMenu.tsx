//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { type Blueprint, type BlueprintRegistry } from '@dxos/assistant';
import { DropdownMenu, IconButton, Input, useTranslation } from '@dxos/react-ui';

import { meta } from '../../meta';

export type ChatOptionsMenuProps = {
  blueprints?: Blueprint[];
  blueprintRegistry?: BlueprintRegistry;
  onChange?: (key: string, active: boolean) => void;
};

export const ChatOptionsMenu = ({ blueprints, blueprintRegistry, onChange }: ChatOptionsMenuProps) => {
  const { t } = useTranslation(meta.id);
  const blueprintOptions = useMemo(
    () => blueprintRegistry?.query().map((blueprint) => ({ key: blueprint.key, label: blueprint.name })),
    [blueprintRegistry],
  );

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <IconButton
          disabled
          icon='ph--plus--regular'
          variant='ghost'
          size={5}
          iconOnly
          label={t('button add blueprint')}
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content side='left'>
          <DropdownMenu.Viewport>
            {blueprintOptions?.map((option) => (
              <DropdownMenu.Item key={option.key}>
                <Input.Root>
                  <Input.Checkbox
                    checked={!!blueprints?.find((blueprint) => blueprint.key === option.key)}
                    onCheckedChange={(checked) => {
                      console.log('checked', option.key, checked);
                      onChange?.(option.key, !!checked);
                    }}
                  />
                  {/* TODO(burdon): Input.Label? */}
                  <span>{option.label}</span>
                </Input.Root>
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
