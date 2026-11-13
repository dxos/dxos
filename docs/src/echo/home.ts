//
// Copyright 2026 DXOS.org
//

export const reasons = [
  {
    title: 'Memory for agents',
    body: 'An agent saves what it learned as ordinary objects, linked to the work they describe and found again with the same query an application uses.',
  },
  {
    title: 'A schema you can read at run time',
    body: 'Every type reports its name and version and converts to JSON Schema, so an agent can see what a space holds, and add a type, while it runs.',
  },
  {
    title: 'One graph for external data',
    body: 'Records synced from other systems become objects with foreign keys. A Ref can link a GitHub issue to a Linear task or a note.',
  },
  {
    title: 'The model plugins code against',
    body: 'A plugin declares its types and reads and writes objects. Its UI, its operations and its agents all share them.',
  },
];

export const guarantees = [
  {
    title: 'A write is visible before the call returns',
    body: 'A query over your local objects reflects db.add and Obj.update, and has told its subscribers, by the time the call returns.',
    cite: 'org.dxos.echo.query#F-2',
  },
  {
    title: 'A remote answer is evidence, not truth',
    body: 'The index and EDGE can lag this tab. ECHO checks each remote entry against local state and drops what local state contradicts.',
    cite: 'org.dxos.echo.query#F-5',
  },
  {
    title: 'One declaration is the schema and the type',
    body: 'A class built with Type.makeObject is both the runtime schema and the TypeScript instance type. There is no second definition to keep in sync.',
    cite: 'org.dxos.echo#F-2',
  },
  {
    title: 'A reference is data, resolved when you ask',
    body: 'A Ref field stores a DXN and loads its target lazily. A missing target is a typed error you can catch by tag.',
    cite: 'org.dxos.echo#F-4',
  },
];

export const routes = [
  {
    title: 'Why ECHO?',
    body: 'Agents, introspection, external data, and the same task written with and without ECHO.',
    href: '/docs/echo/why-echo/',
  },
  {
    title: 'Learning path',
    body: 'Define types, change objects, run queries, share a space.',
    href: '/docs/echo/learn/defining-types/',
  },
  {
    title: 'Guides',
    body: 'Each namespace of @dxos/echo, one page each, with examples.',
    href: '/docs/echo/api/filter/',
  },
];
