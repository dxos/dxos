//
// Copyright 2023 DXOS.org
//

import * as Option from 'effect/Option';
import React, { type FC, useMemo } from 'react';

import { Surface, useAppGraph } from '@dxos/app-framework';
import { Button, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';
import { descriptionMessage, mx } from '@dxos/react-ui-theme';

import { meta } from '../meta';
import { type LocalEntity, type LocalFile, LocalFilesAction } from '../types';

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
  const node = graph.getNode(entity.id).pipe(Option.getOrNull);
  const action =
    node && graph.getActions(node.id).find((action) => action.id === `${LocalFilesAction.Reconnect._tag}:${node.id}`);

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
