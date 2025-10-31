//
// Copyright 2025 DXOS.org
//

import React, { type JSX, useMemo, useState } from 'react';

import { type AiContextBinder } from '@dxos/assistant';
import { type Blueprint } from '@dxos/blueprints';
import { Filter, Obj, Type } from '@dxos/echo';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Icon, IconButton, Popover, Select, useTranslation } from '@dxos/react-ui';
import { Listbox, SearchList } from '@dxos/react-ui-searchlist';
import { Tabs } from '@dxos/react-ui-tabs';

import { useActiveBlueprints, useBlueprintHandlers, useBlueprints, useContextObjects, useItemTypes } from '../../hooks';
import { meta } from '../../meta';

const panelClassNames = 'is-[calc(100dvw-.5rem)] sm:is-max md:is-72 max-is-[--text-content]';

export type ChatOptionsProps = {
  space: Space;
  context: AiContextBinder;
  blueprintRegistry?: Blueprint.Registry;
  presets?: { id: string; label: string }[];
  preset?: string;
  onPresetChange?: (id: string) => void;
};

/**
 * Manages the runtime context for the chat.
 */
export const ChatOptions = ({
  space,
  context,
  blueprintRegistry,
  presets,
  preset,
  onPresetChange,
}: ChatOptionsProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <div role='none' className='flex'>
      <Popover.Root>
        <Popover.Trigger asChild>
          <IconButton variant='ghost' icon='ph--plus--regular' iconOnly size={5} label={t('button context objects')} />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content side='top' classNames={panelClassNames}>
            <Popover.Viewport>
              <ObjectsPanel space={space} context={context} />
            </Popover.Viewport>
            <Popover.Arrow />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <Popover.Root>
        <Popover.Trigger asChild>
          <IconButton
            variant='ghost'
            icon='ph--sliders-horizontal--regular'
            iconOnly
            size={5}
            label={t('button context settings')}
          />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content side='top' classNames={panelClassNames}>
            <Popover.Viewport>
              <Tabs.Root orientation='horizontal' defaultValue='blueprints' defaultActivePart='list' tabIndex={-1}>
                <Tabs.Viewport classNames='max-bs-[--radix-popover-content-available-height] grid grid-rows-[1fr_min-content] [&_[cmdk-root]]:contents [&_[role="tabpanel"]]:grid [&_[role="tabpanel"]]:grid-rows-[1fr_min-content] [&_[role="listbox"]]:min-bs-0 [&_[role="listbox"]]:overflow-y-auto [&_[role="tabpanel"]]:min-bs-0 [&_[role="tabpanel"]]:pli-cardSpacingChrome [&_[role="tabpanel"][data-state="active"]]:order-first [&_[role="tabpanel"][data-state="inactive"]]:hidden'>
                  <Tabs.Tabpanel value='blueprints' tabIndex={-1} classNames='dx-focus-ring-inset'>
                    <BlueprintsPanel blueprintRegistry={blueprintRegistry} space={space} context={context} />
                  </Tabs.Tabpanel>
                  <Tabs.Tabpanel value='model' tabIndex={-1} classNames='dx-focus-ring-inset !pli-0'>
                    <ModelsPanel presets={presets} preset={preset} onPresetChange={onPresetChange} />
                  </Tabs.Tabpanel>
                  <Tabs.Tablist classNames='sm:overflow-x-hidden justify-center p-[--dx-cardSpacingChrome] border-bs border-subduedSeparator order-last'>
                    <Tabs.IconTab
                      value='blueprints'
                      icon='ph--blueprint--regular'
                      label={t('blueprints in context title')}
                    />
                    <Tabs.IconTab value='model' label={t('chat model title')} icon='ph--cpu--regular' />
                  </Tabs.Tablist>
                </Tabs.Viewport>
              </Tabs.Root>
            </Popover.Viewport>
            <Popover.Arrow />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
};

const BlueprintsPanel = ({
  blueprintRegistry,
  space,
  context,
}: Pick<ChatOptionsProps, 'blueprintRegistry' | 'space' | 'context'>) => {
  const { t } = useTranslation(meta.id);

  const blueprints = useBlueprints({ blueprintRegistry, space });
  const activeBlueprints = useActiveBlueprints({ context });
  const { onUpdateBlueprint } = useBlueprintHandlers({ space, context, blueprintRegistry });

  return (
    <SearchList.Root>
      <SearchList.Content classNames='plb-cardSpacingChrome'>
        {blueprints.map((blueprint) => {
          const isActive = activeBlueprints.has(blueprint.key);
          return (
            <SearchList.Item
              classNames='flex items-center overflow-hidden'
              key={blueprint.key}
              value={blueprint.name}
              onSelect={() => onUpdateBlueprint?.(blueprint.key, !isActive)}
            >
              <div className='grow truncate'>{blueprint.name}</div>
              <Icon icon='ph--check--regular' classNames={[!isActive && 'invisible']} />
            </SearchList.Item>
          );
        })}
      </SearchList.Content>
      <SearchList.Input placeholder={t('search placeholder')} classNames='mbe-cardSpacingChrome' autoFocus />
    </SearchList.Root>
  );
};

const ModelsPanel = ({
  presets,
  preset,
  onPresetChange,
}: Pick<ChatOptionsProps, 'presets' | 'preset' | 'onPresetChange'>) => {
  return (
    <Listbox.Root value={preset} onValueChange={onPresetChange} autoFocus>
      {presets?.map(({ id, label }) => {
        return (
          <Listbox.Option key={id} value={id}>
            <Listbox.OptionLabel>{label}</Listbox.OptionLabel>
            <Listbox.OptionIndicator />
          </Listbox.Option>
        );
      })}
    </Listbox.Root>
  );
};

const ANY = '__any__';

const ObjectsPanel = ({ space, context }: Pick<ChatOptionsProps, 'space' | 'context'>): JSX.Element => {
  const { t } = useTranslation(meta.id);

  // Item types sorted by label.
  const types = useItemTypes(space);
  const typenames = useMemo(() => {
    const typenames = types.map((type) => {
      const typename = Type.getTypename(type);
      return {
        typename,
        label: t('typename label', { ns: typename, defaultValue: typename }),
      };
    });

    typenames.sort((a, b) => a.label.localeCompare(b.label));
    return typenames;
  }, [types]);

  // Current type and filter.
  const [typename, setTypename] = useState<string>(ANY);
  const anyFilter = useMemo(
    () => Filter.or(...typenames.map(({ typename }) => Filter.typename(typename))),
    [typenames],
  );

  // Context objects.
  const objects = useQuery(space, typename === ANY ? anyFilter : Filter.typename(typename));
  const { objects: contextObjects, onUpdateObject } = useContextObjects({ space, context });

  return (
    <SearchList.Root>
      <SearchList.Content classNames='p-cardSpacingChrome [&:has([cmdk-list-sizer]:empty)]:plb-0'>
        {objects.length ? (
          objects.map((object) => {
            const label = Obj.getLabel(object) ?? Obj.getTypename(object) ?? object.id;
            const isActive = contextObjects.findIndex((obj) => obj.id === object.id) !== -1;
            return (
              <SearchList.Item
                classNames='flex items-center overflow-hidden'
                key={object.id}
                value={object.id}
                onSelect={() => onUpdateObject?.(Obj.getDXN(object), !isActive)}
              >
                <div className='grow truncate'>{label}</div>
                <Icon icon='ph--check--regular' classNames={[!isActive && 'invisible']} />
              </SearchList.Item>
            );
          })
        ) : (
          <SearchList.Item>{t('no results')}</SearchList.Item>
        )}
      </SearchList.Content>

      <div role='none' className='grid grid-cols-[min-content_1fr] gap-2 pli-cardSpacingChrome mbe-cardSpacingChrome'>
        <Select.Root value={typename === ANY ? undefined : typename} onValueChange={setTypename}>
          <Select.TriggerButton density='fine' placeholder={t('type filter placeholder')} />
          <Select.Portal>
            <Select.Content>
              <Select.ScrollUpButton />
              <Select.Viewport>
                <Select.Option value={ANY}>{t('any type filter label')}</Select.Option>
                {typenames.map(({ typename, label }) => (
                  <Select.Option key={typename} value={typename}>
                    {label}
                  </Select.Option>
                ))}
              </Select.Viewport>
              <Select.ScrollDownButton />
              <Select.Arrow />
            </Select.Content>
          </Select.Portal>
        </Select.Root>
        <SearchList.Input placeholder={t('search placeholder')} classNames='mbe-0' autoFocus />
      </div>
    </SearchList.Root>
  );
};
