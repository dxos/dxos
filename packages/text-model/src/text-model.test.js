//
// Copyright 2020 DXOS.org
//

import { TextModel } from './text-model';

test('initial', () => {
  const model = new TextModel();
  expect(model.content.toString()).toBe('');
  expect(model.textContent).toBe('');
});

test('insertion on empty doc', () => {
  const model = new TextModel();
  model.insert(0, 'Testing insertion on empty doc');
  expect(model.textContent).toBe('Testing insertion on empty doc');
});

test('text content after insert', () => {
  const model = new TextModel();
  model.insert(0, 'INSERTED TEXT');
  expect(model.textContent).toBe('INSERTED TEXT');

  model.insert(8, ' NEW');
  expect(model.textContent).toBe('INSERTED NEW TEXT');
});
