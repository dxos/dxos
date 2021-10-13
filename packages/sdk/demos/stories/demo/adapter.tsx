//
// Copyright 2020 DXOS.org
//

import AddIcon from '@mui/icons-material/Add';
import OrgIcon from '@mui/icons-material/Business';
import DefaultIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import PersonIcon from '@mui/icons-material/PersonOutline';
import ProjectIcon from '@mui/icons-material/WorkOutline';
import { Chip, createTheme, IconButton, Typography } from '@mui/material';
import { makeStyles } from '@mui/styles';
import faker from 'faker';
import React, { useState } from 'react';

import { Database, Item } from '@dxos/echo-db';
import {
  OBJECT_ORG,
  OBJECT_PERSON,
  OBJECT_PROJECT,
  OBJECT_TASK,
  LINK_PROJECT,
  LINK_EMPLOYEE
} from '@dxos/echo-testing';
import { ObjectModel } from '@dxos/object-model';

import { CreateItemCallback, ItemAdapter, ItemDialog, ItemProps } from '../../src';

export const TYPES = {
  [OBJECT_ORG]: OrgIcon,
  [OBJECT_PERSON]: PersonIcon,
  [OBJECT_PROJECT]: ProjectIcon,
  [OBJECT_TASK]: DefaultIcon
};

const Icon = ({ item: { type } }: { item: Item<any> }) => {
  const Icon = (TYPES as any)[type ?? ''] || DefaultIcon;
  if (!Icon) {
    return null;
  }

  return <Icon/>;
};

const useStyles = makeStyles(theme => ({
  sublist: {
    marginTop: theme.spacing(1),
    '& table': {
      tableLayout: 'fixed',
      borderCollapse: 'collapse',
      borderSpacing: 0
    }
  },
  subheader: {
    color: theme.palette.info.dark
  },
  chips: {
    marginTop: theme.spacing(2)
  },
  chip: {
    height: 20,
    padding: 2,
    marginRight: 4,
    borderRadius: 6,
    '& span': {
      paddingLeft: 6,
      paddingRight: 6,
      fontSize: 12
    }
  }
}), { defaultTheme: createTheme({}) });

interface ListProps {
  type: string
  items: Item<any>[]
  title?: string
  handleCreate?: CreateItemCallback
}

export const createAdapter = (database: Database) => {
  // Create sub-item.
  const handleCreate = (parent?: Item<any>, linkType?: string) => async ({ type, name }: ItemProps) => {
    const item = await database.createItem({
      model: ObjectModel,
      type,
      props: {
        name: name,
        description: faker.lorem.sentence()
      }
    });

    // Create link.
    if (parent && linkType) {
      await database.createLink({
        type: linkType, source: parent, target: item
      });
    }

    return item;
  };

  const adapter: ItemAdapter = {
    key: item => item.id,

    icon: Icon,

    primary: item => item.model.getProperty('name'),

    secondary: item => item.model.getProperty('description'),

    sort: (a, b) => {
      const getType = (type?: string) => {
        const TYPE_ORDER = {
          [OBJECT_ORG]: 1,
          [OBJECT_PERSON]: 2,
          [OBJECT_PROJECT]: 3,
          [OBJECT_TASK]: 4
        };

        return (type && TYPE_ORDER[type as keyof typeof TYPE_ORDER]) || Infinity;
      };

      const order = getType(a.type) < getType(b.type) ? -1 : getType(a.type) > getType(b.type) ? 1 : 0;
      if (order !== 0) {
        return order;
      }

      const titleA = a.model.getProperty('name').toLowerCase();
      const titleB = b.model.getProperty('name').toLowerCase();
      return titleA < titleB ? -1 : titleA > titleB ? 1 : 0;
    },

    slices: item => {
      // TODO(burdon): Default value in getter.
      const labels = item.model.getProperty('labels') || {};

      // Sublist.
      const List = ({ type, items, title, handleCreate }: ListProps) => {
        const classes = useStyles();
        const [showDialog, setDialog] = useState(false);

        return (
          <div className={classes.sublist}>
            <Typography variant="caption" className={classes.subheader}>{title}</Typography>
            <table>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td>
                      <Typography variant="body2">&#x2022;</Typography>
                    </td>
                    <td>
                      <Typography variant="body2">
                        {item.model.getProperty('name')}
                      </Typography>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {handleCreate && (
              <>
                <IconButton size="small" onClick={() => setDialog(true)}>
                  <AddIcon/>
                </IconButton>

                <ItemDialog
                  open={showDialog}
                  type={type}
                  types={TYPES}
                  handleCreate={handleCreate}
                  handleClose={() => setDialog(false)}
                />
              </>
            )}
          </div>
        );
      };

      // TODO(burdon): Add/remove labels.
      const Labels = ({ labels }: { labels: string[] }) => {
        const classes = useStyles();

        return (
          <div className={classes.chips}>
            {Object.values(labels).map((label, i) => (
              <Chip key={i} label={label} className={classes.chip}/>
            ))}
          </div>
        );
      };

      const slices = [] as JSX.Element[];
      switch (item.type) {
        case OBJECT_ORG: {
          const projects = item.select().links({ type: LINK_PROJECT }).target().items;
          slices.push(
            <List
              type={OBJECT_PROJECT}
              items={projects}
              title="Projects"
              handleCreate={handleCreate(item, LINK_PROJECT)}
            />
          );

          const employees = item.select().links({ type: LINK_EMPLOYEE }).target().items;
          if (employees.length !== 0) {
            slices.push(
              <List
                type={OBJECT_PERSON}
                items={employees}
                title="Employees"
              />
            );
          }
          break;
        }

        case OBJECT_PROJECT: {
          const tasks = item.select().children().items;
          if (tasks.length !== 0) {
            slices.push(
              <List
                type={OBJECT_TASK}
                items={tasks}
                title="Tasks"
              />);
          }
          break;
        }
      }

      slices.push(<Labels labels={labels}/>);

      return slices;
    }
  };

  return adapter;
};
