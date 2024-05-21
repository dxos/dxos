//
// Copyright 2023 DXOS.org
//

import React, { type FC, useMemo } from 'react';

import { type Action, useGraph } from '@braneframe/plugin-graph';
import { Surface } from '@dxos/app-framework';
import { Button, Main, toLocalizedString, useTranslation } from '@dxos/react-ui';
import {
  baseSurface,
  bottombarBlockPaddingEnd,
  descriptionText,
  mx,
  textBlockWidth,
  topbarBlockPaddingStart,
} from '@dxos/react-ui-theme';

import { FILES_PLUGIN } from '../meta';
import { type LocalFile, type LocalEntity, LocalFilesAction } from '../types';

const LocalFileMain: FC<{ file: LocalFile }> = ({ file }) => {
  const transformedData = useMemo(
    () =>
      file.text
        ? {
            // TODO(burdon): Broken pending replacement of EditorModel.
            // model: { id: file.id, text: () => file.text } as EditorModel,
            properties: { title: file.title, readOnly: true },
          }
        : { file },
    [file.id, Boolean(file.text)],
  );

  if (file.permission !== 'granted') {
    return <PermissionsGate entity={file} />;
  }

  // TODO(wittjosiah): Render file list.
  if ('children' in file) {
    return null;
  }

  return <Surface role='main' data={transformedData} />;
};

const PermissionsGate = ({ entity }: { entity: LocalEntity }) => {
  const { t } = useTranslation(FILES_PLUGIN);
  const { graph } = useGraph();
  const node = graph.findNode(entity.id);
  const action = node?.node(`${LocalFilesAction.RECONNECT}:${node.id}`) as Action | undefined;

  return (
    <Main.Content bounce classNames={[baseSurface, topbarBlockPaddingStart, bottombarBlockPaddingEnd]}>
      <div role='none' className={mx(textBlockWidth, 'pli-2')}>
        <div role='none' className='flex flex-col min-bs-[calc(100dvh-var(--topbar-size))] pb-8'>
          <div role='none' className='min-bs-screen is-full flex items-center justify-center p-8'>
            <p
              role='alert'
              className={mx(
                descriptionText,
                'border border-dashed border-neutral-400/50 rounded-lg flex flex-col space-items-evenly justify-center p-8 font-normal text-lg',
              )}
            >
              {t('missing file permissions')}
              {action && node && (
                <Button onClick={() => action.data({ node })}>{toLocalizedString(action.properties.label, t)}</Button>
              )}
            </p>
          </div>
        </div>
      </div>
    </Main.Content>
  );
};

export default LocalFileMain;
