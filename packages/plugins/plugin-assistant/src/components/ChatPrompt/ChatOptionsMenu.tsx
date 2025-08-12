//
// Copyright 2025 DXOS.org
//

import { useSignalEffect } from '@preact/signals-react';
import React, { useCallback, useMemo, useState } from 'react';

import { type AiContextBinder } from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { type Space } from '@dxos/client/echo';
import { Filter, Obj, Ref } from '@dxos/echo';
import { DropdownMenu, IconButton, Input, useTranslation } from '@dxos/react-ui';
import { isNonNullable } from '@dxos/util';

import { meta } from '../../meta';

export type ChatOptionsMenuProps = {
  space: Space;
  context?: AiContextBinder;
  blueprintRegistry?: Blueprint.Registry;
};

/**
 * Manages the runtime context for the chat.
 */
// TODO(burdon): Refactor this as a Dialog (and move the object selector here also).
export const ChatOptionsMenu = ({ space, context, blueprintRegistry }: ChatOptionsMenuProps) => {
  const { t } = useTranslation(meta.id);

  // TODO(burdon): Possibly constrain query as registry grows.
  const blueprints = useMemo(() => blueprintRegistry?.query() ?? [], [blueprintRegistry]);

  // Create reactive map of active blueprints (by key).
  const [active, setActive] = useState<Map<string, Blueprint.Blueprint>>(new Map());
  useSignalEffect(() => {
    const refs = [...(context?.blueprints.value ?? [])];
    const t = setTimeout(async () => {
      const blueprints = (await Ref.Array.loadAll(refs)).filter(isNonNullable);
      setActive(new Map(blueprints.map((blueprint) => [blueprint.key, blueprint])));
    });

    return () => clearTimeout(t);
  });

  // TODO(burdon): Factor out logic to context? (and toggle ephemeral state).
  const handleBlueprintCheckedChange = useCallback(
    async (key: string, checked: boolean) => {
      if (!context || !blueprintRegistry) {
        return;
      }

      // Find existing cloned blueprint.
      const { objects } = await space.db.query(Filter.type(Blueprint.Blueprint)).run();
      let storedBlueprint = objects.find((blueprint) => blueprint.key === key);
      if (checked) {
        if (!storedBlueprint) {
          const blueprint = blueprintRegistry.getByKey(key);
          if (!blueprint) {
            return;
          }
          // NOTE: Possible race condition with other peers.
          storedBlueprint = space.db.add(Obj.clone(blueprint));
        }
        await context.bind({ blueprints: [Ref.make(storedBlueprint)] });
      } else if (storedBlueprint) {
        await context.unbind({ blueprints: [Ref.make(storedBlueprint)] });
      }
    },
    [space, context, blueprintRegistry],
  );

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <IconButton icon='ph--plus--regular' variant='ghost' size={5} iconOnly label={t('button add blueprint')} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content side='left'>
          <DropdownMenu.Viewport>
            {blueprints.map((blueprint) => (
              <DropdownMenu.CheckboxItem key={blueprint.key}>
                <Input.Root>
                  <Input.Checkbox
                    checked={active?.get(blueprint.key) !== undefined}
                    onCheckedChange={(checked) => handleBlueprintCheckedChange(blueprint.key, !!checked)}
                  />
                  {/* TODO(burdon): Remove need for custom margin. */}
                  {/* TODO(burdon): Clicking on label doesn't toggle checkbox. */}
                  <Input.Label classNames='m-0'>{blueprint.name}</Input.Label>
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
