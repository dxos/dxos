//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import React, { useCallback, useMemo } from 'react';

import { DXN, Filter, Obj, Query, QueryAST } from '@dxos/echo';
import { Form } from '@dxos/react-ui-form';
import { DataType } from '@dxos/schema';

const ProjectSettingsSchema = Schema.Struct({
  label: Schema.String.annotations({ title: 'Label' }),
});

/**
 * ProjectSettings currently is hardcoded to handle only the label which the preset project is based on.
 */
const ProjectSettings = ({ project }: { project: DataType.Project }) => {
  const label = getLabel(project);
  const values = useMemo(() => ({ label }), [label]);

  const handleSave = useCallback(
    (values: { label: string }) => {
      setLabel(project, values.label);
    },
    [project],
  );

  if (!parseProjectPreset(project)) {
    return null;
  }

  return <Form autoSave schema={ProjectSettingsSchema} values={values} outerSpacing={false} onSave={handleSave} />;
};

export default ProjectSettings;

// NOTE: The below project parsing must be kept in sync with the project preset in order to work correctly.

const parseProjectPreset = (project: DataType.Project) => {
  const view1 = project.collections[0]?.target;
  const view2 = project.collections[1]?.target;
  if (!Obj.instanceOf(DataType.View, view1) || !Obj.instanceOf(DataType.View, view2)) {
    return;
  }

  const query1 = Obj.getSnapshot(view1).query;
  const query2 = Obj.getSnapshot(view2).query;
  if (
    query1.type !== 'options' ||
    query2.type !== 'select' ||
    query2.filter.type !== 'object' ||
    query2.filter.typename !== DXN.fromTypenameAndVersion(DataType.Person.typename, DataType.Person.version).toString()
  ) {
    return;
  }

  return {
    mailboxView: view1,
    mailboxQuery: query1,
    contactsView: view2,
    contactsQuery: query2,
  };
};

const getLabel = (project: DataType.Project) => {
  const { mailboxQuery } = parseProjectPreset(project) ?? {};
  if (!mailboxQuery) {
    return '';
  }

  let label = '';
  QueryAST.visit(mailboxQuery, (node) => {
    if (node.type !== 'select') {
      return;
    }
    if (node.filter.type !== 'object') {
      return;
    }
    if (node.filter.props.properties.type !== 'object') {
      return;
    }
    if (node.filter.props.properties.props.labels.type !== 'contains') {
      return;
    }

    label = node.filter.props.properties.props.labels.value;
  });

  return label;
};

const setLabel = (project: DataType.Project, label: string) => {
  const { mailboxView, mailboxQuery, contactsView } = parseProjectPreset(project) ?? {};
  if (!mailboxView || !mailboxQuery || !contactsView) {
    return;
  }

  mailboxView.query = Query.select(
    Filter.type(DataType.Message, { properties: { labels: Filter.contains(label) } }),
  ).options(mailboxQuery.options).ast;
  contactsView.query = Query.select(Filter.type(DataType.Person, { jobTitle: label })).ast;
};
