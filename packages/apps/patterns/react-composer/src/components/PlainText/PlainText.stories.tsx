//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import CodeMirror from '@uiw/react-codemirror';
import React, { useEffect, useReducer } from 'react';
import { yCollab } from 'y-codemirror.next';

import { PublicKey, Text } from '@dxos/client';
import { useQuery, useSpace } from '@dxos/react-client';
import { ClientSpaceDecorator } from '@dxos/react-client/testing';
import { Button } from '@dxos/react-components';

import { ComposerDocument } from '../../testing';

export default {
  component: CodeMirror
};

export const Default = {
  render: ({ id, spaceKey }: { id: number; spaceKey: PublicKey }) => {
    // TODO(wittjosiah): Text being created isn't firing react updates.
    const [, forceUpdate] = useReducer((state) => state + 1, 0);

    const space = useSpace(spaceKey);
    const [document] = useQuery(space, ComposerDocument.filter());

    useEffect(() => {
      if (space && id === 0) {
        setTimeout(async () => {
          // TODO(burdon): Auto-create document.
          const document = new ComposerDocument({ content: new Text() });
          await space?.db.add(document);
        });
      }
    }, [space]);

    if (!document?.content) {
      return <Button onClick={() => forceUpdate()}>Update</Button>;
    }

    const ytext = document.content.doc!.getText('plain');

    return (
      <CodeMirror
        value={ytext.toString()}
        extensions={[
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          // TODO(wittjosiah): Create yjs awareness plugin using mesh.
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          yCollab(ytext)
        ]}
      />
    );
  },
  decorators: [ClientSpaceDecorator({ count: 2 })]
};
