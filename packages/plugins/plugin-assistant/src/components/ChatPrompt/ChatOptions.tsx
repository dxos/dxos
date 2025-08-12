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

export type ChatOptionsProps = {
  context?: AiContextBinder;
  blueprintRegistry?: Blueprint.Registry;
  onUpdateBlueprint?: (key: string, isActive: boolean) => void;
};

/**
 * Manages the runtime context for the chat.
 */
// TODO(burdon): Refactor this as a Dialog (and move the object selector here also).
export const ChatOptions = ({ context, blueprintRegistry, onUpdateBlueprint }: ChatOptionsProps) => {
  const { t } = useTranslation(meta.id);

  // TODO(burdon): Possibly constrain query as registry grows.
  const blueprints = useMemo(() => blueprintRegistry?.query() ?? [], [blueprintRegistry]);
  const activeBlueprints = useBlueprints({ context });

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
                    checked={activeBlueprints?.get(blueprint.key) !== undefined}
                    onCheckedChange={(checked) => onUpdateBlueprint?.(blueprint.key, !!checked)}
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

//
// NOTE: The hooks below have stable APIs but the logic is subject to change.
// They are provided here to future proof the capabilities of the options menu.
//

/**
 * Create reactive map of active blueprints (by key).
 */
// TODO(burdon): Factor out.
export const useBlueprints = ({ context }: { context?: AiContextBinder }) => {
  const [active, setActive] = useState<Map<string, Blueprint.Blueprint>>(new Map());
  useSignalEffect(() => {
    const refs = [...(context?.blueprints.value ?? [])];
    const t = setTimeout(async () => {
      const blueprints = (await Ref.Array.loadAll(refs)).filter(isNonNullable);
      setActive(new Map(blueprints.map((blueprint) => [blueprint.key, blueprint])));
    });

    return () => clearTimeout(t);
  });

  return active;
};

// TODO(burdon): Factor out.
// TODO(burdon): Context should manage ephemeral state of bindings until prompt is issued?
export const useContextHandlers = ({
  space,
  context,
  blueprintRegistry,
}: {
  space: Space;
  context?: AiContextBinder;
  blueprintRegistry?: Blueprint.Registry;
}) => {
  const onUpdateBlueprint = useCallback(
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

  return { onUpdateBlueprint };
};
