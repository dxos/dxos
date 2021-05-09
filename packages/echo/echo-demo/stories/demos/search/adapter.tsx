//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Chip, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import OrgIcon from '@material-ui/icons/Business';
import DefaultIcon from '@material-ui/icons/CheckBoxOutlineBlank';
import PersonIcon from '@material-ui/icons/PersonOutline';
import ProjectIcon from '@material-ui/icons/WorkOutline';

import { Item } from '@dxos/echo-db';
import {
  OBJECT_ORG,
  OBJECT_PERSON,
  OBJECT_PROJECT,
  OBJECT_TASK,
  LINK_PROJECT,
  LINK_EMPLOYEE
} from '@dxos/echo-testing';

import { ItemAdapter } from '../../../src';

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
}));

export const adapter: ItemAdapter = {
  key: item => item.id,
  primary: item => item.model.getProperty('name'),
  secondary: item => item.model.getProperty('description'),
  icon: Icon,
  slices: item => {
    // TODO(burdon): Default value in getter.
    const labels = item.model.getProperty('labels') || {};

    // Sublist.
    const List = ({ items, title }: { items: Item<any>[], title?: string }) => {
      const classes = useStyles();

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
        if (projects.length !== 0) {
          slices.push(<List items={projects} title="Projects"/>);
        }

        const employees = item.select().links({ type: LINK_EMPLOYEE }).target().items;
        if (employees.length !== 0) {
          slices.push(<List items={employees} title="Employees"/>);
        }
        break;
      }

      case OBJECT_PROJECT: {
        const tasks = item.select().children().items;
        if (tasks.length !== 0) {
          slices.push(<List items={tasks} title="Tasks"/>);
        }
        break;
      }
    }

    slices.push(<Labels labels={labels}/>);

    return slices;
  }
};
