//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import React, { type FC, useState } from 'react';
import renderer from 'react-test-renderer';
import { test } from 'vitest';

import { getTextContent, TextObject } from '@dxos/echo-schema';

import { useTextModel } from '../../hooks';

test('TextEditor', () => {
  const component = renderer.create(<Test value={100} />);
  const result = component.toJSON();
  console.log(':::', result);
  expect(result.type).to.eq('div');
  expect(result.children).to.deep.eq([String(100)]);
});

const Test: FC<{ value: number }> = ({ value: initialValue }) => {
  const [value] = useState(initialValue);
  return <div>{value}</div>;
};

const Test2 = () => {
  const text = useState(new TextObject('hello world'));
  const model = useTextModel({ text: item.text });
  if (!model) {
    return null;
  }

  return (
    <div>
      <div>{model?.id}</div>
      <div>{getTextContent(text)}</div>
    </div>
  );
};
