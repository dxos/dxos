//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import React from 'react';
import renderer from 'react-test-renderer';
import { test } from 'vitest';

import { getTextContent, TextObject } from '@dxos/echo-schema';

test('TextEditor', () => {
  const component = renderer.create(<Test />);
  expect(component).to.exist;
});

const Test = () => {
  const text = new TextObject('hello world');
  // const model = useTextModel({ text: item.text });
  return <div>{getTextContent(text)}</div>;
};

// test('TextEditor2', () => {
//   const component = renderer.create(<TextEditor />);
//   expect(component).to.exist;
// });
