//
// Copyright 2023 DXOS.org
//

import React, { FC, PropsWithChildren } from 'react';

import { ClassNameValue, Input, List, ListItem } from '@dxos/aurora';

import { Card, FormCard, ImageCard, LayoutProps } from './Card';

export type TypeCardProps = PropsWithChildren<{
  id: string;
  type?: string;
  classNames?: ClassNameValue;
  sqaure?: boolean;
}>;

// TODO(burdon): Create factory of layouts with property binders.
export const TypeCard: FC<LayoutProps & TypeCardProps> = ({ id, type, classNames, handle, sqaure, menu, ...props }) => {
  const data: any = props;

  switch (type) {
    case 'document': {
      return (
        <Card.Root classNames={classNames} square={sqaure}>
          <Card.Header>
            {handle}
            <Card.Title title={data.title} />
            {menu}
          </Card.Header>
          <Card.Body indent={!!handle}>
            <div className='font-thin line-clamp-[6]'>{data.body}</div>
          </Card.Body>
        </Card.Root>
      );
    }

    case 'image': {
      return (
        <ImageCard
          classNames={classNames}
          handle={handle}
          menu={menu}
          src={data.src}
          body={data.body}
          square={sqaure}
          bottom
        />
      );
    }

    case 'message': {
      return (
        <Card.Root classNames={classNames}>
          <Card.Header>
            {handle}
            <Card.Title title={data.from} classNames='text-sm font-thin' />
            {menu}
          </Card.Header>
          <Card.Body indent={!!handle}>
            <div>{data.body}</div>
          </Card.Body>
        </Card.Root>
      );
    }

    case 'contact': {
      return (
        <FormCard
          classNames={classNames}
          handle={handle}
          menu={menu}
          title={data.name}
          sections={[
            { label: 'Username', value: data.username },
            { label: 'Email', value: data.email },
          ]}
        />
      );
    }

    case 'project': {
      return (
        <FormCard
          classNames={classNames}
          handle={handle}
          menu={menu}
          title={data.name}
          sections={[
            {
              value: data.body,
            },
          ]}
        >
          <List>
            {data.tasks.map((task: any) => (
              // TODO(burdon): Center align by default.
              <ListItem.Root key={task.id} classNames='flex items-center gap-2'>
                <Input.Root>
                  <Input.Checkbox checked={task.done} />
                </Input.Root>
                {/* TODO(burdon): Align center. */}
                <ListItem.Heading classNames='truncate'>{task.title}</ListItem.Heading>
              </ListItem.Root>
            ))}
          </List>
        </FormCard>
      );
    }

    default:
      return null;
  }
};
