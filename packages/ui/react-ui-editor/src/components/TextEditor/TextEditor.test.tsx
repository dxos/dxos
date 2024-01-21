//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import React, { type FC, useState } from 'react';
import renderer, { type ReactTestRendererJSON } from 'react-test-renderer';
import { test } from 'vitest';

// TODO(burdon): Error
//  Warning: Accessing non-existent property 'dcodeIO' of module exports inside circular dependency
// import { TextObject } from '@dxos/echo-schema';

// import { useTextModel } from '../../hooks';

test('TextEditor', () => {
  const value = 100;
  const component = renderer.create(<Test value={value} />);
  const result = component.toJSON() as ReactTestRendererJSON;
  expect(result.type).to.eq('div');
  expect(result.children).to.deep.eq([String(value)]);
});

const Test: FC<{ value: number }> = ({ value: initialValue }) => {
  const [value] = useState(initialValue);
  return <div>{value}</div>;
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
