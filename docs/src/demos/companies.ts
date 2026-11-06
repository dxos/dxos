//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Ref } from '@dxos/echo';
import { Organization, Person } from '@dxos/types';

/** The schemas `seedCompanies` writes. */
export const companySchemas = [Organization.Organization, Person.Person];

type Company = { name: string; status: string; description: string; people: string[] };

const COMPANIES: Company[] = [
  {
    name: 'Northwind Labs',
    status: 'prospect',
    description: 'Field sensors for vineyards.',
    people: ['Ada Park', 'Theo Lindqvist'],
  },
  {
    name: 'Riverbend Foods',
    status: 'prospect',
    description: 'A cooperative of regional bakeries.',
    people: ['Mina Okafor'],
  },
  {
    name: 'Halcyon Robotics',
    status: 'qualified',
    description: 'Warehouse picking arms.',
    people: ['Jonas Weber', 'Priya Natarajan'],
  },
  { name: 'Quarry & Co', status: 'active', description: 'Stone supply for restoration work.', people: ['Sam Delgado'] },
  {
    name: 'Lumen Health',
    status: 'active',
    description: 'Clinic scheduling and records.',
    people: ['Ines Moreau', 'Kai Tanaka'],
  },
  {
    name: 'Bluefin Logistics',
    status: 'commit',
    description: 'Cold-chain shipping on the coast.',
    people: ['Rosa Alvarez'],
  },
];

/** Six companies across the pipeline's stages, each with the people who work there. */
export const seedCompanies = Effect.fnUntraced(function* () {
  for (const { name, status, description, people } of COMPANIES) {
    const website = `https://${name.split(' ')[0].toLowerCase()}.example`;
    const organization = yield* Database.add(
      Organization.make({ name, description, website, status: status as Organization.Organization['status'] }),
    );
    for (const fullName of people) {
      yield* Database.add(Person.make({ fullName, organization: Ref.make(organization) }));
    }
  }
});
