//
// Copyright 2026 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';

import { Event, Organization, Person } from '../schema.ts';

// #region instance
const northwind = Obj.make(Organization, {
  name: 'Northwind Labs',
  website: 'https://northwind.example',
});
const ada = Obj.make(Person, {
  name: 'Ada Lovelace',
  employer: Ref.make(northwind),
});
const review = Obj.make(Event, {
  title: 'Quarterly review',
  attendees: [Ref.make(ada)],
});
// #endregion

// @ts-expect-error A person without a name does not compile.
Obj.make(Person, {});

// #region follow
const employer = ada.employer?.peek();
console.log(employer?.name);
// #endregion

export { review };
