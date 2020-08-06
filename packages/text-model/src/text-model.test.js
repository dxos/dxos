//
// Copyright 2020 DXOS.org
//

import { TextModel } from './text-model';

let model;

beforeEach(() => {
  model = new TextModel();
});

test('initial', () => {
  expect(model.content.toString()).toBe('');
  expect(model.textContent).toBe('');
});

test('insertion on empty doc', () => {
  model.insert(0, 'Testing insertion on empty doc');
  expect(model.textContent).toBe('Testing insertion on empty doc');
});

test('text content after insert', () => {
  model.insert(0, 'INSERTED TEXT');
  expect(model.textContent).toBe('INSERTED TEXT');

  model.insert(8, ' NEW');
  expect(model.textContent).toBe('INSERTED NEW TEXT');
});
