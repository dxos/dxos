//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useEffect, useState } from 'react';

import { TextObject } from '@dxos/client/echo';
import { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text'; // TODO(burdon): Remove.
import { ClientSpaceDecorator } from '@dxos/react-client/testing';

import { ScriptEditor } from './ScriptEditor';

const Story = () => {
  const [content, setContent] = useState<TextObject>();
  useEffect(() => {
    setContent(new TextObject("console.log('hello world!')", TextKind.PLAIN));
  }, []);

  if (!content) {
    return null;
  }

  return (
    <div className={'flex flex-col h-[300px] w-full overflow-hidden m-8 border'}>
      <ScriptEditor content={content} />
    </div>
  );
};

export default {
  component: ScriptEditor,
  render: Story,
  decorators: [ClientSpaceDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {};
