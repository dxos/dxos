//
// Copyright 2026 DXOS.org
//

//
// The Ontologies slide, declared rather than imported: three boxed groups — the values a thing is described with, the
// things themselves, and what holds and arranges them — with the entities split into three columns about a Person.
// Nothing here is geometry; `spec.ts` places it.
//

import { type SlideSpec } from './spec.ts';

const card = (id: string, label: string, icon: string, tone?: string) => ({
  id,
  label,
  icon,
  ...(tone ? { tone } : {}),
});

export const ONTOLOGY: SlideSpec = {
  id: 'ontology',
  title: 'Ontologies',
  groups: [
    {
      id: 'types',
      heading: 'Types',
      box: true,
      columns: [
        [
          card('type-text', 'Text', 'text-t'),
          card('type-drawing', 'Drawing', 'scribble'),
          card('type-contact', 'Contact', 'address-book'),
          card('type-address', 'Address', 'map-pin'),
          card('type-file', 'File', 'file', 'file'),
        ],
      ],
    },
    {
      id: 'entities',
      heading: 'Entities',
      box: true,
      columns: [
        // What a person belongs to.
        [
          card('project', 'Project', 'folder'),
          card('group', 'Group', 'users-three'),
          card('organization', 'Organization', 'buildings'),
          card('account', 'Account', 'user-circle'),
        ],
        // The person every other entity is about, alone so it sits on the slide's axis.
        // Taller than the rest: every entity on the right says something about a Person, and five arrivals need the
        // height to land apart.
        [{ ...card('person', 'Person', 'user'), size: { height: 256 } }],
        // What a person does.
        [
          card('task', 'Task', 'check-square'),
          card('event', 'Event', 'calendar-blank', 'event'),
          card('message', 'Message', 'chat-text', 'message'),
          card('transaction', 'Transaction', 'currency-circle-dollar'),
          card('trip', 'Trip', 'airplane-tilt', 'trip'),
        ],
      ],
    },
    {
      id: 'containers',
      heading: 'Containers',
      box: true,
      columns: [
        [
          card('container-document', 'Document', 'file-text'),
          card('container-presentation', 'Presentation', 'presentation-chart'),
          card('container-sheet', 'Sheet', 'grid-four', 'sheet'),
          card('container-kanban', 'Kanban', 'kanban'),
          card('container-table', 'Table', 'table'),
          card('container-transcript', 'Transcript', 'microphone'),
          card('container-tag', 'Tag', 'tag'),
        ],
      ],
    },
  ],
  edges: [
    { from: 'group', to: 'organization', label: 'part of' },
    { from: 'project', to: 'group', label: 'owned by' },
    { from: 'person', to: 'group', label: 'member of' },
    { from: 'task', to: 'project', label: 'in' },
    { from: 'task', to: 'person', label: 'assignee' },
    { from: 'event', to: 'person', label: 'attendee' },
    { from: 'message', to: 'person', label: 'sender' },
    { from: 'transaction', to: 'person', label: 'payee' },
    { from: 'transaction', to: 'organization', label: 'payer' },
    { from: 'person', to: 'trip', label: 'traveller' },
  ],
};
