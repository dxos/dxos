//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import React, { useCallback, useContext, useMemo, useState } from 'react';

import {
  Listbox,
  OrderedList,
  Tree,
  type TreeSelectEvent,
  createStaticTreeModel,
} from '@dxos/react-ui-list';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import * as Typography from '@dxos/react-ui/Typography';

const PEOPLE = [
  { value: 'ada', label: 'Ada Lovelace', description: 'Analyst' },
  { value: 'grace', label: 'Grace Hopper', description: 'Compiler author' },
  { value: 'alan', label: 'Alan Turing', description: 'Logician' },
];

// #region listbox
/** One row per option; selecting a row reports its value. */
export const PeopleListbox = () => {
  const [selected, setSelected] = useState<string>('ada');
  return (
    <Listbox.Root items={PEOPLE} value={selected} onValueChange={setSelected}>
      <Listbox.Label>People</Listbox.Label>
      <Listbox.Viewport>
        <Listbox.Content>
          {PEOPLE.map((person) => (
            <Listbox.Item key={person.value} id={person.value}>
              <Listbox.ItemIcon icon='ph--user--regular' />
              <Listbox.ItemText />
              <Listbox.ItemDescription />
              <Listbox.ItemIndicator />
            </Listbox.Item>
          ))}
        </Listbox.Content>
      </Listbox.Viewport>
    </Listbox.Root>
  );
};
// #endregion

type Step = { id: string; label: string };

const STEPS: Step[] = [
  { id: 'draft', label: 'Draft the agenda' },
  { id: 'invite', label: 'Invite the team' },
  { id: 'book', label: 'Book a room' },
  { id: 'notes', label: 'Share the notes' },
];

// #region ordered
/** Rows the user can drag into a new order, each with a remove button. */
export const Agenda = () => {
  const [steps, setSteps] = useState(STEPS);
  const move = useCallback(
    (from: number, to: number) =>
      setSteps((steps) => {
        const next = [...steps];
        const [step] = next.splice(from, 1);
        next.splice(to, 0, step);
        return next;
      }),
    [],
  );

  return (
    <OrderedList.Root
      items={steps}
      getLabel={(step) => step.label}
      onMove={move}
    >
      {({ items }) => (
        <OrderedList.Viewport>
          <OrderedList.Content aria-label='Agenda'>
            {items.map((step) => (
              <OrderedList.Item key={step.id} id={step.id}>
                <OrderedList.DragHandle />
                <OrderedList.ItemText />
                <SystemButton.Remove
                  onClick={() =>
                    setSteps((steps) =>
                      steps.filter(({ id }) => id !== step.id),
                    )
                  }
                />
              </OrderedList.Item>
            ))}
          </OrderedList.Content>
        </OrderedList.Viewport>
      )}
    </OrderedList.Root>
  );
};
// #endregion

// #region data
type Folder = { id: string; name: string; items: Folder[] };

const ROOT: Folder = {
  id: 'root',
  name: 'Contacts',
  items: [
    {
      id: 'work',
      name: 'Work',
      items: [
        { id: 'ada', name: 'Ada Lovelace', items: [] },
        { id: 'grace', name: 'Grace Hopper', items: [] },
      ],
    },
    {
      id: 'family',
      name: 'Family',
      items: [{ id: 'alan', name: 'Alan Turing', items: [] }],
    },
  ],
};
// #endregion

// #region tree
/** A tree over an in-memory folder structure; open and selected rows are kept in the model. */
export const FolderTree = () => {
  const registry = useContext(RegistryContext);
  const [selected, setSelected] = useState<string[]>();
  const model = useMemo(
    () =>
      createStaticTreeModel(ROOT, {
        getChildren: (folder) => folder.items,
        getProps: (folder) => ({
          label: folder.name,
          icon:
            folder.items.length > 0
              ? 'ph--folder--regular'
              : 'ph--user--regular',
        }),
      }),
    [],
  );

  const handleOpenChange = ({
    path,
    open,
  }: {
    path: string[];
    open: boolean;
  }) => {
    const state = model.stateAtom(path);
    registry.set(state, { ...registry.get(state), open });
  };

  const handleSelect = ({ path, current }: TreeSelectEvent<Folder>) => {
    if (selected) {
      const previous = model.stateAtom(selected);
      registry.set(previous, { ...registry.get(previous), current: false });
    }
    const state = model.stateAtom(path);
    registry.set(state, { ...registry.get(state), current });
    setSelected(current ? path : undefined);
  };

  return (
    <>
      <Tree.Root
        id='contacts'
        model={model}
        rootId={model.rootId}
        onOpenChange={handleOpenChange}
        onSelect={handleSelect}
      >
        <Tree.Label srOnly>Contacts</Tree.Label>
        <Tree.Content />
      </Tree.Root>
      <Typography.Text tone='muted'>
        {selected ? `Selected ${selected.at(-1)}` : 'Nothing selected'}
      </Typography.Text>
    </>
  );
};
// #endregion
