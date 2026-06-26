//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { type FC, useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { DXN, Obj, Ref, Type } from '@dxos/echo';
import { Annotation } from '@dxos/echo';
import { random } from '@dxos/random';
import { Card } from '@dxos/react-ui';
import { CardContainer, type CardContainerProps } from '@dxos/react-ui-mosaic/testing';
import { Expando } from '@dxos/schema';
import { Organization, Person, Pipeline, Task } from '@dxos/types';

import { JsonCard } from '../cards';

export type DefaultStoryProps<T extends Obj.Any, P extends {} = {}> = {
  Component: FC<AppSurface.ObjectCardProps<T> & P>;
  createObject: () => T;
  image?: boolean;
  json?: boolean;
  componentProps?: P;
};

export const DefaultStory = <T extends Obj.Any, P extends {} = {}>({
  Component,
  createObject,
  image,
  json,
  componentProps,
}: DefaultStoryProps<T, P>) => {
  const object = useMemo(() => createObject(), [createObject]);
  const roles: CardContainerProps['role'][] = ['intrinsic', 'popover'];

  return (
    <div className='h-full w-full grid grid-cols-2 py-16 gap-8'>
      {roles.map((role, i) => (
        <div key={i} className='flex h-full justify-center overflow-hidden'>
          <div className='flex flex-col gap-4 w-full items-center'>
            <span className='text-sm text-description'>{role}</span>
            <CardContainer role={role}>
              <Card.Root border={false}>
                <Card.Header>
                  <Card.DragHandle />
                  <Card.Title>{Obj.getLabel(object)}</Card.Title>
                  <Card.Menu />
                </Card.Header>
                <Component
                  role={role ?? 'card--content'}
                  subject={image ? object : omitImage(object)}
                  {...(componentProps ?? ({} as P))}
                />
                {json && <JsonCard data={object} />}
              </Card.Root>
            </CardContainer>
          </div>
        </div>
      ))}
    </div>
  );
};

export const omitImage = ({ image: _, ...rest }: any) => rest;

/**
 * Factory functions for creating test objects at render time.
 */
export const createOrganization = (): Organization.Organization => {
  return Obj.make(Organization.Organization, {
    name: random.company.name(),
    image:
      'https://plus.unsplash.com/premium_photo-1672116452571-896980a801c8?q=80&w=2671&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    website: random.internet.url(),
    description: random.lorem.paragraph(),
  });
};

export const createPerson = (): Person.Person => {
  const organization = createOrganization();
  return Obj.make(Person.Person, {
    fullName: random.person.fullName(),
    image:
      'https://plus.unsplash.com/premium_photo-1664536392779-049ba8fde933?q=80&w=2574&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    organization: Ref.make(organization),
    emails: [
      { label: 'Work', value: random.internet.email() },
      { label: 'Work', value: random.internet.email() },
      { label: 'Work', value: random.internet.email() },
    ],
  });
};

export const createProject = (): Pipeline.Pipeline => {
  return Obj.make(Pipeline.Pipeline, {
    name: random.person.fullName(),
    image: 'https://dxos.network/dxos-logotype-blue.png',
    description: random.lorem.paragraph(),
    columns: [],
  });
};

export const createTask = (): Task.Task => {
  return Obj.make(Task.Task, {
    title: random.lorem.sentence(),
    status: random.helpers.arrayElement(['todo', 'in-progress', 'done'] as const),
  });
};

/**
 * Plain object cast as `Obj.Any` — has no schema, typename, or database, so cards
 * like `FormCard` fall through to their empty/unsupported state. Use to story-pin
 * fallback rendering.
 */
export const createUnknown = (): Obj.Any => ({}) as unknown as Obj.Any;

/**
 * Typed object with no user-facing values (only `id`). All Person fields are
 * optional, so `Obj.make(Person, {})` is valid and triggers the FormCard
 * "no values" branch in readonly mode.
 */
export const createPersonEmpty = (): Person.Person => Obj.make(Person.Person, {});

/**
 * Mock of the `Table` schema (org.dxos.type.table): an optional `name` plus
 * `view` and `sizes` fields annotated with `FormInputAnnotation.set(false)`.
 * When constructed without a `name`, no form-renderable field has a value so
 * FormCard should fall through to its empty state — even though
 * `Object.keys(subject)` includes `view`/`sizes`.
 */
const TableLike = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  view: Schema.String.pipe(Annotation.FormInputAnnotation.set(false)),
  sizes: Schema.Record({ key: Schema.String, value: Schema.Number }).pipe(
    Schema.mutable,
    Annotation.FormInputAnnotation.set(false),
  ),
}).pipe(Type.makeObject(DXN.make('org.dxos.test.tableLike', '0.1.0')));
type TableLike = Type.InstanceType<typeof TableLike>;

/**
 * Table-like object with values only in form-hidden fields (`view`, `sizes`).
 * `Object.keys` includes them, but a naive `hasValues` check would
 * misclassify this as having data. FormCard must consult the schema's
 * form-input annotations to correctly fall through to the empty state.
 */
export const createTableEmpty = (): TableLike =>
  Obj.make(TableLike, { view: 'view-dxn:placeholder', sizes: {} } as Obj.MakeProps<typeof TableLike>);

export const createExpando = (): Expando.Expando => {
  return Expando.make({
    name: random.person.fullName(),
    email: random.internet.email(),
    age: random.number.int({ min: 18, max: 80 }),
    active: random.datatype.boolean(),
  });
};
