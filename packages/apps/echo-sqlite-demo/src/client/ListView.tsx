//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Ref } from '@dxos/echo';
import { Listbox } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';
import * as Typography from '@dxos/react-ui/Typography';

import type { Organization, Person } from '../schema.ts';

type Entry = { value: string; label: string; description?: string };

/**
 * One bordered card per type, each holding a `Listbox`.
 *
 * `Listbox.ItemText` / `ItemDescription` take NO children — they read `label` and `description`
 * from the `items` passed to `Listbox.Root`, and that is what places them in the row's grid.
 * Passing children instead renders them unplaced, which reads as overlapping text.
 */
export const ListView = ({
  organizations,
  people,
  onRemove,
}: {
  organizations: readonly Organization[];
  people: readonly Person[];
  onRemove?: (id: string) => void;
}) => {
  const orgEntries: Entry[] = organizations.map((org) => ({ value: org.id, label: org.name }));

  const peopleEntries: Entry[] = people.map((person) => {
    // Read the ref synchronously: both queries are loaded, so the target is resident.
    const employer = Ref.isRef(person.employer) ? person.employer.target : undefined;
    return {
      value: person.id,
      label: person.name,
      description: employer ? `${person.email} · ${employer.name}` : person.email,
    };
  });

  return (
    <ScrollArea.Root>
      <ScrollArea.Viewport classNames='p-3 space-y-3'>
        <Section title='Organizations' entries={orgEntries} onRemove={onRemove} />
        <Section title='People' entries={peopleEntries} onRemove={onRemove} />
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

const Section = ({
  title,
  entries,
  onRemove,
}: {
  title: string;
  entries: Entry[];
  onRemove?: (id: string) => void;
}) => (
  <Card.Root>
    <Card.Header>
      <Card.Title>
        {title} · {entries.length}
      </Card.Title>
    </Card.Header>
    <Card.Section>
      {entries.length === 0 ? (
        <Typography.Text classNames='text-fg-subtle text-sm'>Nothing yet.</Typography.Text>
      ) : (
        <Listbox.Root items={entries}>
          <Listbox.Content>
            {entries.map((entry) => (
              <Listbox.Item key={entry.value} id={entry.value}>
                <Listbox.ItemText />
                <Listbox.ItemDescription />
                {onRemove && (
                  <Button.Root
                    iconOnly
                    icon='ph--x--regular'
                    variant='ghost'
                    label='Remove'
                    onClick={() => onRemove(entry.value)}
                  />
                )}
              </Listbox.Item>
            ))}
          </Listbox.Content>
        </Listbox.Root>
      )}
    </Card.Section>
  </Card.Root>
);
