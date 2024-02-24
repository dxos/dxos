//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { expect } from 'chai';

import { test } from '@dxos/test';

import { EchoObject } from './schema';

export class Employee extends EchoObject.extend<Employee>()({
  name: S.string,
  salary: S.number,
}) {}

export class Organization extends EchoObject.extend<Organization>()({
  name: S.string,
  employees: S.array(Employee),
}) {}

test('valid properties', () => {
  const org = new Organization({
    name: 'NewComp',
    employees: [new Employee({ name: 'John', salary: 100 })],
  });
  const t = org.__schema();
  S.validateSync(t)(org);
  expect(org.id).not.to.be.undefined;
});

test('is echo object test', () => {
  const properties = {
    name: 'NewComp',
    employees: [new Employee({ name: 'John', salary: 100 })],
  };
  const org = new Organization(properties);
  S.validateSync(EchoObject)(org);
  expect(() => S.validateSync(EchoObject)(properties)).to.throw();
});

test('invalid properties', () => {
  expect(
    () =>
      new Organization({
        employees: [new Employee({ name: 'John', salary: 100 })],
      } as any),
  ).to.throw();
});
