//
// Copyright 2024 DXOS.org
//

import { render, screen } from '@testing-library/react';
import chai, { expect } from 'chai';
import chaiDom from 'chai-dom';
import React, { type FC, useState, useMemo } from 'react';
import { describe, test } from 'vitest';

import { TextEditor } from './TextEditor';
import type { EditorModel } from '../../hooks';

// TODO(burdon): Error
//  Warning: Accessing non-existent property 'dcodeIO' of module exports inside circular dependency
// import { TextObject } from '@dxos/echo-schema';

// import { useTextModel } from '../../hooks';

chai.use(chaiDom);

describe('TextEditor', () => {
  test('renders', () => {
    const value = 'hello';
    render(<Test value={value} />);
    expect(screen.getByRole('textbox')).to.have.text(value);
  });
});

const Test: FC<{ value: string }> = ({ value: initialValue }) => {
  const [value] = useState(initialValue);
  const model: EditorModel = useMemo(
    () => ({
      id: 'test',
      text: () => value,
      content: value,
    }),
    [],
  );

  return <TextEditor model={model} />;
};

// const Test2 = () => {
//   const [text] = useState(new TextObject('hello world'));
//   const model = useTextModel({ text });
//   if (!model) {
//     return null;
//   }
//
//   return (
//     <div>
//       <div>{model?.id}</div>
//       <div>{getTextContent(text)}</div>
//     </div>
//   );
// };
