//
// Copyright 2025 DXOS.org
//

import type { ObjectStructure } from '@dxos/echo-protocol';
import { DXN, ObjectId } from '@dxos/keys';

export const TYPES = {
  document: DXN.fromTypenameAndVersion('example.org/type/Document', '0.1.0').toString(),
  collection: DXN.fromTypenameAndVersion('example.org/type/Collection', '0.1.0').toString(),
  org: DXN.fromTypenameAndVersion('example.org/type/Org', '0.1.0').toString(),
  contact: DXN.fromTypenameAndVersion('example.org/type/Contact', '0.1.0').toString(),
  task: DXN.fromTypenameAndVersion('example.org/type/Task', '0.1.0').toString(),
  worksFor: DXN.fromTypenameAndVersion('example.org/relation/WorksFor', '0.1.0').toString(),
};

const createArticle = (title: string, content: string): { id: ObjectId; doc: ObjectStructure } => {
  return {
    id: ObjectId.random(),
    doc: {
      system: {
        kind: 'object',
        type: { '/': TYPES.document },
      },
      meta: { keys: [] },
      data: {
        title,
        content,
      },
    },
  };
};

const createCollection = (name: string, objects: ObjectId[]): { id: ObjectId; doc: ObjectStructure } => {
  return {
    id: ObjectId.random(),
    doc: {
      system: { kind: 'object', type: { '/': TYPES.collection } },
      meta: { keys: [] },
      data: {
        name,
        objects: objects.map((id) => ({ '/': DXN.fromLocalObjectId(id).toString() })),
      },
    },
  };
};

const createOrganization = (name: string, website?: string): { id: ObjectId; doc: ObjectStructure } => {
  return {
    id: ObjectId.random(),
    doc: {
      system: {
        kind: 'object',
        type: { '/': TYPES.org },
      },
      meta: { keys: [] },
      data: { name, website },
    },
  };
};

const createContact = (name: string, email: string): { id: ObjectId; doc: ObjectStructure } => {
  return {
    id: ObjectId.random(),
    doc: {
      system: {
        kind: 'object',
        type: { '/': TYPES.contact },
      },
      meta: { keys: [] },
      data: {
        name,
        email,
      },
    },
  };
};

const createTask = (
  title: string,
  description: string,
  assignedTo?: ObjectId,
): { id: ObjectId; doc: ObjectStructure } => {
  return {
    id: ObjectId.random(),
    doc: {
      system: {
        kind: 'object',
        type: { '/': TYPES.task },
      },
      meta: { keys: [] },
      data: {
        title,
        description,
        assignedTo: assignedTo ? { '/': DXN.fromLocalObjectId(assignedTo).toString() } : undefined,
      },
    },
  };
};

const createWorksFor = (source: ObjectId, target: ObjectId, since: string): { id: ObjectId; doc: ObjectStructure } => {
  return {
    id: ObjectId.random(),
    doc: {
      system: {
        kind: 'relation',
        type: { '/': TYPES.worksFor },
        source: { '/': DXN.fromLocalObjectId(source).toString() },
        target: { '/': DXN.fromLocalObjectId(target).toString() },
      },
      meta: { keys: [] },
      data: { since },
    },
  };
};

export const ARTICLES = {
  marineLife: createArticle(
    'Marine Life',
    `
      Many marine animals migrate between foraging areas and reproductive sites, often timing the return migration with extreme precision. In theory, the decision to return should reflect energy acquisition at foraging areas, energetic costs associated with transit, and timing arrival for successful reproduction. For long-distance migrations to be successful, animals must integrate ‘map’ information to assess where they are relative to their reproductive site as well as ‘calendar’ information to know when to initiate the return migration given their distance from home1. Elephant seals, Mirounga angustirostris, migrate thousands of kilometers from reproductive sites to open ocean foraging areas (Figure 1A), yet return within a narrow window of time to specific beaches2. Each year, pregnant female elephant seals undertake a ∼240-day, 10,000 km foraging migration across the Northeast Pacific Ocean before returning to their breeding beaches, where they give birth 5 days after arriving2. We found that the seals’ abilities to adjust the timing of their return migration is based on the perception of space and time, which further elucidates the mechanisms behind their astonishing navigational feats3.
    `,
  ),
  warsawWeather: createArticle(
    'Warsaw Weather',
    `
  Warsaw Weather Forecast. Providing a local hourly Warsaw weather forecast of rain, sun, wind, humidity and temperature.
  The Long-range 12 day forecast also includes detail for Warsaw weather today. Live weather reports from Warsaw weather stations and weather warnings that include risk of thunder, high UV index and forecast gales. See the links below the 12-day Warsaw weather forecast table for other cities and towns nearby along with weather conditions for local outdoor activities.
  Warsaw is 78 m above sea level and located at 52.25° N 21.04° E. Warsaw has a population of 1702139. Local time in Warsaw is 1:57:03 PM CEST.
`,
  ),
  developmentsInBiomedicine: createArticle(
    'Developments in Biomedicine',
    `
      Since the completion of the groundbreaking Human Genome Project, massive strides have been made in our understanding of biology, science, and the human body.
      Many developments have been made on the genetic or cellular level that could have enormous applications for the future.
      But which have been the most important?
      The last decade has already borne significant fruit from 3D printing new organs using stem cells to customizing drug therapies for patients to potentially making human cells virus-proof. As science improves and our understanding grows, the next decade or decades could change healthcare forever. 
    `,
  ),
};

export const COLLECTIONS = {
  articles: createCollection(
    'Articles',
    Object.values(ARTICLES).map(({ id }) => id),
  ),
};

export const ORGANIZATIONS = {
  cyberdyne: createOrganization('Cyberdyne Systems', 'https://cyberdyne.com'),
  amco: createOrganization('AMCO', 'https://amco.com'),
};

export const CONTACTS = {
  john: createContact('John Doe', 'john.doe@example.com'),
  sarah: createContact('Sarah Johnson', 'sarah.johnson@techvision.com'),
  michael: createContact('Michael Chen', 'michael.chen@techvision.com'),
  emma: createContact('Emma Rodriguez', 'e.rodriguez@investors.com'),
  david: createContact('David Williams', 'david@accountingfirm.com'),
};

export const TASKS = {
  task1: createTask('Task 1', 'Task 1 description', CONTACTS.john.id),
  task2: createTask('Task 2', 'Task 2 description', CONTACTS.sarah.id),
  task3: createTask('Task 3', 'Task 3 description', CONTACTS.michael.id),
};

export const WORKS_FOR = {
  johnAtCyberdyne: createWorksFor(CONTACTS.john.id, ORGANIZATIONS.cyberdyne.id, '2020'),
  sarahAtCyberdyne: createWorksFor(CONTACTS.sarah.id, ORGANIZATIONS.cyberdyne.id, '2021'),
  michaelAtAmco: createWorksFor(CONTACTS.michael.id, ORGANIZATIONS.amco.id, '2019'),
  emmaAtCyberdyne: createWorksFor(CONTACTS.emma.id, ORGANIZATIONS.cyberdyne.id, '2022'),
  davidAtAmco: createWorksFor(CONTACTS.david.id, ORGANIZATIONS.amco.id, '2018'),
};

export const OBJECTS = [
  ...Object.values(ARTICLES),
  ...Object.values(COLLECTIONS),
  ...Object.values(ORGANIZATIONS),
  ...Object.values(CONTACTS),
  ...Object.values(TASKS),
  ...Object.values(WORKS_FOR),
];
