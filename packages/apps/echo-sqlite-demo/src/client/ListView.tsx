//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Obj } from '@dxos/echo';
import { useResolveRef } from '@dxos/echo-react';
import { Listbox } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';

import type { Organization, Person } from '../schema.ts';

/**
 * People and organizations as rows. `Listbox` owns its own padding and keyboard navigation, so
 * there is no wrapper and no `dx-current` wiring here.
 */
export const ListView = ({
  organizations,
  people,
  onRemove,
}: {
  organizations: readonly Organization[];
  people: readonly Person[];
  onRemove?: (obj: Person | Organization) => void;
}) => {
  const items = [
    ...organizations.map((org) => ({ value: org.id, label: org.name })),
    ...people.map((person) => ({ value: person.id, label: person.name, description: person.email })),
  ];

  return (
    <Listbox.Root items={items}>
      <Listbox.Viewport>
        <Listbox.Content>
          {organizations.map((org) => (
            <Listbox.Item key={org.id} id={org.id}>
              <Listbox.ItemText>{org.name}</Listbox.ItemText>
              {onRemove && (
                <Button.Root
                  iconOnly
                  icon='ph--x--regular'
                  variant='ghost'
                  label='Remove'
                  onClick={() => onRemove(org)}
                />
              )}
            </Listbox.Item>
          ))}
          {people.map((person) => (
            <PersonItem key={person.id} person={person} onRemove={onRemove} />
          ))}
        </Listbox.Content>
      </Listbox.Viewport>
    </Listbox.Root>
  );
};

/** The ref traversal that makes this a graph rather than two tables. */
const PersonItem = ({ person, onRemove }: { person: Person; onRemove?: (obj: Person) => void }) => {
  // Resolves the ref and re-renders when its target changes — one row loaded, not the space.
  const employer = useResolveRef(person.employer);

  return (
    <Listbox.Item id={person.id}>
      <Listbox.ItemText>{person.name}</Listbox.ItemText>
      <Listbox.ItemDescription>
        {employer ? `${person.email} · ${employer.name}` : person.email}
      </Listbox.ItemDescription>
      {onRemove && (
        <Button.Root iconOnly icon='ph--x--regular' variant='ghost' label='Remove' onClick={() => onRemove(person)} />
      )}
    </Listbox.Item>
  );
};
