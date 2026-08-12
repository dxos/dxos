//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { Filter, Obj } from '@dxos/echo';
import { type Space, useQuery } from '@dxos/react-client/echo';
import { Input, Panel, Toolbar } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';

/**
 * Generic space inspector: a filterable {@link Listbox} of every object in the active space
 * (label, typename, id — the filter matches any of them), with the selected object's JSON shown in
 * an overlay. A lighter sibling of {@link DatabaseModule} for stories that just need to see what
 * landed in the space.
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

  const filtered = useMemo(() => {
    const query = text.trim().toLowerCase();
    if (!query) {
      return objects;
    }
    return objects.filter((object) => {
      const label = Obj.getLabel(object) ?? '';
      const typename = Obj.getTypename(object) ?? '';
      return label.toLowerCase().includes(query) || typename.toLowerCase().includes(query) || object.id.includes(query);
    });
  }, [objects, text]);

  return (
    <Panel.Root classNames='relative'>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Input.Root>
            <Input.TextInput
              classNames='grow'
              placeholder='Filter objects…'
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </Input.Root>
          <Toolbar.Text classNames='shrink-0 text-description text-sm'>{filtered.length}</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='relative min-h-0'>
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
    </Panel.Root>
  );
};
