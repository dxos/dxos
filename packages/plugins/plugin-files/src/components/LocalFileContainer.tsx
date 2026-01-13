//
// Copyright 2023 DXOS.org
//

import * as Option from 'effect/Option';
import React, { type FC, useMemo } from 'react';

import { Surface, useAppGraph } from '@dxos/app-framework/react';
import { Graph } from '@dxos/plugin-graph';
import { Button, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';
import { descriptionMessage, mx } from '@dxos/ui-theme';

import { meta } from '../meta';
import { type LocalEntity, type LocalFile, LocalFilesOperation } from '../types';

const LocalFileContainer: FC<{ file: LocalFile }> = ({ file }) => {
  const transformedData = useMemo(
    () => ({ subject: file.text ? { id: file.id, text: file.text } : file }),
    [file.id, Boolean(file.text)],
  );

  if (file.permission !== 'granted') {
    return <PermissionsGate entity={file} />;
  }

  // TODO(wittjosiah): Render file list.
  if ('children' in file) {
    return null;
  }

  return <Surface role='article' data={transformedData} />;
};

const PermissionsGate = ({ entity }: { entity: LocalEntity }) => {
  const { t } = useTranslation(meta.id);
  const { graph } = useAppGraph();
  const node = Graph.getNode(graph, entity.id).pipe(Option.getOrNull);
  const action =
    node &&
    Graph.getActions(graph, node.id).find(
      (action) => action.id === `${LocalFilesOperation.Reconnect.meta.key}:${node.id}`,
    );

  return (
    <StackItem.Content>
      <div role='none' className='overflow-auto p-8 grid place-items-center'>
        <p role='alert' className={mx(descriptionMessage, 'break-words rounded-md p-8')}>
          {t('missing file permissions')}
          {action && node && (
            <Button onClick={() => action.data({ node })}>{toLocalizedString(action.properties.label, t)}</Button>
          )}
        </p>
      </div>
    </StackItem.Content>
  );
};

export default LocalFileContainer;
