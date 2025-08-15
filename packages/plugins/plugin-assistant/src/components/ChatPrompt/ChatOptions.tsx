//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { type AiContextBinder } from '@dxos/assistant';
import { Blueprint } from '@dxos/blueprints';
import { Filter, Obj, Type } from '@dxos/echo';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Icon, IconButton, Popover, Select, useTranslation } from '@dxos/react-ui';
import { SearchList } from '@dxos/react-ui-searchlist';
import { Tabs } from '@dxos/react-ui-tabs';
import { descriptionMessage, mx } from '@dxos/react-ui-theme';

import {
  useActiveBlueprints,
  useActiveReferences,
  useBlueprintHandlers,
  useBlueprints,
  useReferencesHandlers,
} from '../../hooks';
import { meta } from '../../meta';
import { Assistant } from '../../types';

export type ChatOptionsProps = {
  space: Space;
  context: AiContextBinder;
  blueprintRegistry?: Blueprint.Registry;
  presets?: { id: string; label: string }[];
  preset?: string;
  onPresetChange?: (id: string) => void;
};

const idleFilter = Filter.not(
  Filter.or(
    Filter.type(Blueprint.Blueprint),
    Filter.type(Assistant.Chat),
    Filter.typename('dxos.org/type/Properties'),
    Filter.typename('dxos.org/type/View'),
  ),
);

const omitFromTypenameOptions = [
  Blueprint.Blueprint.typename,
  Assistant.Chat.typename,
  'dxos.org/type/Properties',
  'dxos.org/type/View',
];

const useTypenameOptions = (space?: Space) => {
  const [schemas, setSchemas] = useState<string[]>([]);
  useEffect(() => {
    if (!space) {
      return;
    }

    return space.db.schemaRegistry.query().subscribe(
      (query) => {
        setSchemas(
          Array.from(
            new Set(
              [...space.db.graph.schemaRegistry.schemas, ...query.results]
                .map(Type.getTypename)
                .filter((typename) => !omitFromTypenameOptions.includes(typename)),
            ),
          ),
        );
      },
      { fire: true },
    );
  }, [space]);

  return schemas;
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

  const blueprints = useBlueprints({ blueprintRegistry });
  const activeBlueprints = useActiveBlueprints({ context });
  const { onUpdateBlueprint } = useBlueprintHandlers({
    space,
    context,
    blueprintRegistry,
  });

  const [activeTypename, setActiveTypename] = useState<string>('idle');
  const typenameOptions = useTypenameOptions(space);

  const activeReferences = useActiveReferences({ context });
  const { onUpdateReference } = useReferencesHandlers({
    space,
    context,
  });
  const referenceOptions = useQuery(space, activeTypename === 'idle' ? idleFilter : Filter.typename(activeTypename));

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <IconButton
          icon='ph--plus--regular'
          variant='ghost'
          size={5}
          iconOnly
          label={t('context objects placeholder')}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side='top'>
          <Tabs.Root
            orientation='horizontal'
            defaultValue='blueprints'
            defaultActivePart='list'
            classNames='min-is-min is-[calc(100dvw-.5rem)] sm:is-max max-is-[--text-content]'
          >
            <Tabs.Viewport classNames='max-bs-[--radix-popover-content-available-height] grid grid-rows-[1fr_min-content] [&_[cmdk-root]]:contents [&_[role="tabpanel"]]:grid [&_[role="tabpanel"]]:grid-rows-[1fr_min-content] [&_[role="listbox"]]:min-bs-0 [&_[role="listbox"]]:overflow-y-auto [&_[role="tabpanel"]]:min-bs-0 [&_[role="tabpanel"]]:pli-cardSpacingChrome [&_[role="tabpanel"][data-state="active"]]:order-first [&_[role="tabpanel"][data-state="inactive"]]:hidden'>
              <Tabs.Tabpanel value='blueprints'>
                <SearchList.Root>
                  <SearchList.Content classNames='plb-cardSpacingChrome'>
                    {blueprints.map((blueprint) => {
                      const isActive = activeBlueprints.has(blueprint.key);
                      return (
                        <SearchList.Item
                          classNames='flex gap-2 items-center'
                          key={blueprint.key}
                          value={blueprint.name}
                          onSelect={() => onUpdateBlueprint?.(blueprint.key, !isActive)}
                        >
                          <Icon icon='ph--check--regular' classNames={[!isActive && 'invisible']} />
                          {blueprint.name}
                        </SearchList.Item>
                      );
                    })}
                  </SearchList.Content>
                  <SearchList.Input placeholder={t('search placeholder')} classNames='mbe-cardSpacingChrome' />
                </SearchList.Root>
              </Tabs.Tabpanel>
              <Tabs.Tabpanel value='objects'>
                <SearchList.Root>
                  {referenceOptions.length ? (
                    <>
                      <SearchList.Content classNames='plb-cardSpacingChrome [&:has([cmdk-list-sizer]:empty)]:plb-0'>
                        {referenceOptions.map((object: any) => {
                          const label = Obj.getLabel(object) ?? Obj.getTypename(object) ?? object.id;
                          const value = Obj.getDXN(object).toString();
                          const isActive = activeReferences.has(value);
                          return (
                            <SearchList.Item
                              classNames='flex gap-2 items-center'
                              key={value}
                              value={label}
                              onSelect={() => onUpdateReference?.(value, !isActive)}
                            >
                              <Icon icon='ph--check--regular' classNames={[!isActive && 'invisible']} />
                              {label}
                            </SearchList.Item>
                          );
                        })}
                      </SearchList.Content>
                      <SearchList.Empty classNames={[descriptionMessage, 'mlb-cardSpacingChrome']}>
                        {t('no reference options label')}
                      </SearchList.Empty>
                    </>
                  ) : (
                    <p className={mx(descriptionMessage, 'mlb-cardSpacingChrome')}>{t('no reference options label')}</p>
                  )}
                  <div role='none' className='grid grid-cols-[min-content_1fr] gap-2 mbe-cardSpacingChrome'>
                    <Select.Root
                      value={activeTypename === 'idle' ? undefined : activeTypename}
                      onValueChange={setActiveTypename}
                    >
                      <Select.TriggerButton density='fine' placeholder={t('type filter placeholder')} />
                      <Select.Portal>
                        <Select.Content>
                          <Select.ScrollUpButton />
                          <Select.Viewport>
                            <Select.Option value='idle'>{t('idle type filter label')}</Select.Option>
                            {typenameOptions.map((typename) => (
                              <Select.Option key={typename} value={typename}>
                                {t('typename label', { ns: typename, defaultValue: typename })}
                              </Select.Option>
                            ))}
                          </Select.Viewport>
                          <Select.ScrollDownButton />
                          <Select.Arrow />
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                    <SearchList.Input placeholder={t('search placeholder')} classNames='mbe-0' />
                  </div>
                </SearchList.Root>
              </Tabs.Tabpanel>
              <Tabs.Tabpanel value='model'>
                <ul role='listbox' className='plb-cardSpacingChrome'>
                  {presets?.map(({ id, label }) => {
                    const isActive = preset === id;
                    return (
                      <li
                        role='option'
                        key={id}
                        aria-selected={isActive}
                        tabIndex={0}
                        className='dx-focus-ring flex gap-2 items-center p-1 rounded-sm select-none cursor-pointer hover:bg-hoverOverlay'
                        onClick={() => onPresetChange?.(id)}
                      >
                        <Icon icon='ph--check--regular' classNames={[!isActive && 'invisible']} />
                        {label}
                      </li>
                    );
                  })}
                </ul>
              </Tabs.Tabpanel>
              <Tabs.Tablist classNames='sm:overflow-x-hidden p-[--dx-cardSpacingChrome] border-bs border-subduedSeparator order-last'>
                <Tabs.IconTab
                  value='blueprints'
                  icon='ph--blueprint--regular'
                  label={t('blueprints in context title')}
                />
                <Tabs.IconTab value='objects' label={t('objects in context title')} icon='ph--file--regular' />
                <Tabs.IconTab value='model' label={t('chat model title')} icon='ph--cpu--regular' />
              </Tabs.Tablist>
            </Tabs.Viewport>
          </Tabs.Root>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
