//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { type Database, Filter, Obj, Order, Query } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { ObjectForm } from '@dxos/react-ui-form';
import * as Button from '@dxos/react-ui/Button';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Listbox from '@dxos/react-ui/Listbox';
import * as Panel from '@dxos/react-ui/Panel';
import * as Status from '@dxos/react-ui/Status';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import * as Typography from '@dxos/react-ui/Typography';

import { ns } from '../icons/translations.ts';
import { DeletePopover } from '../overlays/ContactsScreen.tsx';
import { Person } from './schema.ts';

// #region query
const people = Query.select(Filter.type(Person)).orderBy(Order.property<Person>('name', 'asc'));
// #endregion

// #region list
/** A row that re-renders when its person is renamed. */
const PersonRow = ({ person }: { person: Person }) => {
  const [snapshot] = useObject(person);
  return <Listbox.Item item={{ value: person.id, label: snapshot.name, description: snapshot.email }} />;
};

type PeopleListProps = {
  people: Person[];
  selected?: string;
  onSelect: (id: string) => void;
};

const PeopleList = ({ people, selected, onSelect }: PeopleListProps) => (
  <Listbox.Root
    items={people.map((person) => ({ value: person.id, label: person.name }))}
    value={selected ? [selected] : []}
    onValueChange={([id]) => id && onSelect(id)}
  >
    <Listbox.Viewport>
      <Listbox.Content aria-label='Contacts'>
        {people.map((person) => (
          <PersonRow key={person.id} person={person} />
        ))}
      </Listbox.Content>
    </Listbox.Viewport>
  </Listbox.Root>
);
// #endregion

// #region detail
/** Re-renders when this person changes, here or on another peer. */
const PersonDetail = ({ person }: { person: Person }) => {
  const [snapshot] = useObject(person);
  return (
    <Layout.Flex column gap='sm' classNames='p-4'>
      <Typography.Text asChild>
        <h2>{snapshot.name}</h2>
      </Typography.Text>
      {snapshot.email && (
        <Layout.Flex gap='sm' align='center'>
          <Icon.Icon icon='ph--envelope--regular' />
          <Typography.Text tone='muted'>{snapshot.email}</Typography.Text>
        </Layout.Flex>
      )}
    </Layout.Flex>
  );
};
// #endregion

// #region edit
/** A form built from `Person`'s schema; each change is written to the object as it is made. */
const EditDialog = ({ label, person }: { label: string; person: Person }) => {
  const [snapshot] = useObject(person);
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button.Root icon='ph--pencil-simple--regular' label={label} iconOnly />
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>{snapshot.name}</Dialog.Title>
          <Dialog.CloseTrigger />
        </Dialog.Header>
        <Dialog.Body>
          <ObjectForm type={Person} object={person} showTags={false} />
        </Dialog.Body>
      </Dialog.Content>
    </Dialog.Root>
  );
};
// #endregion

// #region screen
export const ContactsScreen = ({ db }: { db: Database.Database }) => {
  const { t } = Hooks.useTranslation(ns);
  const contacts = useQuery(db, people);
  const [selected, setSelected] = useState<string>();
  const person = contacts.find(({ id }) => id === selected);

  const handleAdd = () => {
    const name: string = t('new-contact.name');
    const person = db.add(Obj.make(Person, { name }));
    setSelected(person.id);
  };

  const handleDelete = (person: Person) => {
    db.remove(person);
    setSelected(undefined);
  };

  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Toolbar.Text>{t('title.label')}</Toolbar.Text>
          <Toolbar.Text>{t('count.label', { count: contacts.length })}</Toolbar.Text>
          <Toolbar.Separator variant='gap' />
          <Button.Root icon='ph--plus--regular' label={t('add.label')} iconOnly onClick={handleAdd} />
          {person && <EditDialog label={t('edit.label')} person={person} />}
          {person && <DeletePopover label={t('delete.label')} onDelete={() => handleDelete(person)} />}
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <Layout.Grid cols={['16rem', 'fill']} grow>
          <PeopleList people={contacts} selected={selected} onSelect={setSelected} />
          {person ? (
            <PersonDetail person={person} />
          ) : (
            <Status.Empty icon='ph--address-book--regular'>{t('empty.message')}</Status.Empty>
          )}
        </Layout.Grid>
      </Panel.Body>
    </Panel.Root>
  );
};
// #endregion
