//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { Filter, Obj } from '@dxos/echo';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Input, Panel, Select, Toolbar } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';

/** `Select` values must be non-empty strings, so "no type filter" needs a sentinel. */
const ALL_TYPES = '__all__';

/**
 * Generic space inspector: a filterable {@link Listbox} of every object in the active space — a
 * type selector (distinct typenames present) plus a text filter matching label/typename/id. A
 * lighter sibling of {@link DatabaseModule} for stories that just need to see what landed in the
 * space.
 */
export const ObjectsModule = () => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }

  return <ObjectsModuleContainer space={space} />;
};

const ObjectsModuleContainer = ({ space }: { space: Space }) => {
  const objects = useQuery(space.db, Filter.everything());
  const [text, setText] = useState('');
  const [type, setType] = useState(ALL_TYPES);

  // Distinct typenames present in the space, kept sorted; a stale selection (its last object
  // removed) falls back to matching nothing rather than being silently reset.
  const typenames = useMemo(
    () => [...new Set(objects.map((object) => Obj.getTypename(object) ?? 'unknown'))].sort(),
    [objects],
  );

  const filtered = useMemo(() => {
    const query = text.trim().toLowerCase();
    return objects.filter((object) => {
      const typename = Obj.getTypename(object) ?? 'unknown';
      if (type !== ALL_TYPES && typename !== type) {
        return false;
      }
      if (!query) {
        return true;
      }
      const label = Obj.getLabel(object) ?? '';
      return label.toLowerCase().includes(query) || typename.toLowerCase().includes(query) || object.id.includes(query);
    });
  }, [objects, text, type]);

  return (
    <Panel.Root classNames='relative'>
      <Panel.Toolbar asChild>
        <Toolbar.Root classNames='grid grid-cols-2'>
          <Select.Root value={type} onValueChange={setType}>
            <Select.TriggerButton placeholder='Type' />
            <Select.Portal>
              <Select.Content>
                <Select.Viewport>
                  <Select.Option value={ALL_TYPES}>All types</Select.Option>
                  {typenames.map((typename) => (
                    <Select.Option key={typename} value={typename}>
                      {typename}
                    </Select.Option>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
          <Input.Root>
            <Input.TextInput
              classNames='grow'
              placeholder='Filter objects…'
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </Input.Root>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <Listbox.Root>
          <Listbox.Viewport thin>
            <Listbox.Content aria-label='Objects'>
              {filtered.map((object) => (
                <Listbox.Item key={object.id} id={object.id}>
                  <div className='flex flex-col gap-0.5 overflow-hidden'>
                    <div className='truncate'>{Obj.getLabel(object) ?? object.id}</div>
                    <div className='text-xs text-description truncate'>{Obj.getTypename(object) ?? 'unknown'}</div>
                  </div>
                </Listbox.Item>
              ))}
            </Listbox.Content>
          </Listbox.Viewport>
        </Listbox.Root>
      </Panel.Content>
      <Panel.Statusbar>
        <div className='p-1 text-description text-sm'>{filtered.length}</div>
      </Panel.Statusbar>
    </Panel.Root>
  );
};
