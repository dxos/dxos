//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { type Space } from '@dxos/react-client/echo';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { CredentialsTable } from '../../../../components/index.ts';
import { SpaceSelector } from '../../../../containers/index.ts';
import { useCredentials, useDevtoolsState } from '../../../../hooks/index.ts';
import { type ArticleProps } from '../../types.ts';

export const CredentialsArticle = ({ role, ...props }: ArticleProps & { space?: Space }) => {
  const state = useDevtoolsState();
  const space = props.space ?? state.space;
  const credentials = useCredentials({ spaceKey: state.haloSpaceKey ?? space?.key });

  return (
    <Panel.Root role={role}>
      {!props.space && (
        <Panel.Header>
          <Toolbar.Root>
            <SpaceSelector />
          </Toolbar.Root>
        </Panel.Header>
      )}
      <Panel.Body>
        <CredentialsTable credentials={credentials} />
      </Panel.Body>
    </Panel.Root>
  );
};
