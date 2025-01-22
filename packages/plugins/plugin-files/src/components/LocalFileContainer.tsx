//
// Copyright 2023 DXOS.org
//

import React, { type FC, useMemo } from 'react';

import { Surface } from '@dxos/app-framework';
import { useGraph } from '@dxos/plugin-graph';
import { Button, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';
import { descriptionText, mx } from '@dxos/react-ui-theme';

import { FILES_PLUGIN } from '../meta';
import { type LocalFile, type LocalEntity, LocalFilesAction } from '../types';

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
  const { t } = useTranslation(FILES_PLUGIN);
  const { graph } = useGraph();
  const node = graph.findNode(entity.id);
  const action =
    node && graph.actions(node).find((action) => action.id === `${LocalFilesAction.Reconnect._tag}:${node.id}`);

  return (
    <StackItem.Content toolbar={false}>
      <div role='none' className='overflow-auto p-8 grid place-items-center'>
        <p
          role='alert'
          className={mx(descriptionText, 'break-words border border-dashed border-separator rounded-lg p-8')}
        >
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
