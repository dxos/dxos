//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import React, { useState } from 'react';
import renderer from 'react-test-renderer';
import { test } from 'vitest';

import { getTextContent, TextObject } from '@dxos/echo-schema';

import { useTextModel } from '../../hooks';

test('TextEditor', () => {
  const component = renderer.create(<Test />);
  expect(component).to.exist;
});

const Test = () => {
  const [value] = useState(100);
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
