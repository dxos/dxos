//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { type Blueprint } from '@dxos/blueprints';
import { DropdownMenu, IconButton, Input, useTranslation } from '@dxos/react-ui';

import { meta } from '../../meta';

export type ChatOptionsMenuProps = {
  registry?: Blueprint.Registry;
  active?: string[];
  onChange?: (key: string, active: boolean) => void;
};

// TODO(burdon): Refactor this as a Dialog (and move the object selector here also).
export const ChatOptionsMenu = ({ registry, active, onChange }: ChatOptionsMenuProps) => {
  const { t } = useTranslation(meta.id);
  const blueprintOptions = useMemo(
    () => registry?.query().map((blueprint) => ({ key: blueprint.key, label: blueprint.name })),
    [registry],
  );

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild disabled={!blueprintOptions?.length}>
        <IconButton icon='ph--plus--regular' variant='ghost' size={5} iconOnly label={t('button add blueprint')} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content side='left'>
          <DropdownMenu.Viewport>
            {blueprintOptions?.map((option) => (
              <DropdownMenu.CheckboxItem key={option.key}>
                <Input.Root>
                  <Input.Checkbox
                    checked={!!active?.includes(option.key)}
                    onCheckedChange={(checked) => onChange?.(option.key, !!checked)}
                  />
                  {/* TODO(burdon): Remove need for custom margin. */}
                  {/* TODO(burdon): Clicking on label doesn't toggle checkbox. */}
                  <Input.Label classNames='m-0'>{option.label}</Input.Label>
                </Input.Root>
              </DropdownMenu.CheckboxItem>
            ))}
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
