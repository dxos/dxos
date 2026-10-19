//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import * as Chat from '@dxos/assistant/Chat';
import { type Database, Filter, Obj, Type, type URI } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { SearchList, useSearchListResults } from '@dxos/react-ui-search';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Select from '@dxos/react-ui/Select';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { getStyles } from '@dxos/ui-theme';

import { useFilteredTypes } from '#hooks';
import { meta } from '#meta';

const ANY = '__any__' as const;

export type ChatObjectPickerProps = {
  db: Database.Database;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the object picked; the dialog closes after. */
  onSelect: (object: Obj.Unknown) => void;
};

/**
 * Searches the space for an object to mention. The fuller sibling of the `@` menu: a type filter and a
 * list that scrolls, for when the name alone is not enough to find it.
 */
export const ChatObjectPicker = ({ db, open, onOpenChange, onSelect }: ChatObjectPickerProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  return (
    <Dialog.Root open={open} onOpenChange={({ open }) => onOpenChange(open)}>
      {/* Hung from the top: the list grows and shrinks as the search narrows, and a centred dialog would move with it. */}
      <Dialog.Content placement='start' data-testid='assistant.object-picker'>
        <Dialog.Header>
          <Dialog.Title>{t('add-object.title')}</Dialog.Title>
          <Dialog.CloseTrigger />
        </Dialog.Header>
        <Dialog.Body>
          <ObjectSearch
            db={db}
            onSelect={(object) => {
              onSelect(object);
              onOpenChange(false);
            }}
          />
        </Dialog.Body>
      </Dialog.Content>
    </Dialog.Root>
  );
};

const ObjectSearch = ({ db, onSelect }: Pick<ChatObjectPickerProps, 'db' | 'onSelect'>) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);

  // Item types sorted by label.
  const types = useFilteredTypes(db);
  const typeOptions = useMemo(() => {
    const options = types.map((type) => {
      const typename = Type.getTypename(type);
      return { uri: Type.getURI(type), label: t('typename.label', { ns: typename, defaultValue: typename }) };
    });
    options.sort((a, b) => a.label.localeCompare(b.label));
    return options;
  }, [types, t]);

  const typeItems = useMemo(
    () => [
      { value: ANY, label: t('any-type-filter.label') },
      ...typeOptions.map(({ uri, label }) => ({ value: uri, label })),
    ],
    [typeOptions, t],
  );

  const [selectedUri, setSelectedUri] = useState<URI.URI | typeof ANY>(ANY);
  const anyFilter = useMemo(() => Filter.or(...typeOptions.map(({ uri }) => Filter.type(uri))), [typeOptions]);
  const queried = useQuery(db, selectedUri === ANY ? anyFilter : Filter.type(selectedUri));
  // The conversation itself is in context already and never something to mention.
  const objects = useMemo(() => queried.filter((object) => !Obj.instanceOf(Chat.Chat, object)), [queried]);
  const { results, handleSearch } = useSearchListResults({
    items: objects,
    extract: (object) => Obj.getLabel(object) ?? Obj.getTypename(object) ?? object.id,
  });

  return (
    <SearchList.Root onSearch={handleSearch}>
      <Toolbar.Root>
        <SearchList.Input placeholder={t('search.placeholder')} autoFocus />
        <Select.Root
          items={typeItems}
          value={selectedUri === ANY ? [] : [selectedUri]}
          onValueChange={({ value: [value] }) =>
            setSelectedUri(typeOptions.find(({ uri }) => uri === value)?.uri ?? ANY)
          }
        >
          <Select.Trigger fixed placeholder={t('type-filter.placeholder')} />
          <Select.Content>
            {typeItems.map((item) => (
              <Select.Item key={item.value} item={item} />
            ))}
          </Select.Content>
        </Select.Root>
      </Toolbar.Root>
      <SearchList.Content>
        <SearchList.Viewport classNames='max-h-[50dvh]'>
          {results.length ? (
            results.map((object) => {
              const { icon, hue } = Obj.getIcon(object) ?? { icon: 'ph--cube--regular', hue: undefined };
              return (
                <SearchList.Item
                  key={object.id}
                  value={object.id}
                  icon={icon}
                  iconClassNames={hue ? getStyles(hue).text : undefined}
                  label={Obj.getLabel(object) ?? Obj.getTypename(object) ?? object.id}
                  onSelect={() => onSelect(object)}
                />
              );
            })
          ) : (
            <SearchList.Item value='__empty__' label={t('no-results.message')} />
          )}
        </SearchList.Viewport>
      </SearchList.Content>
    </SearchList.Root>
  );
};
