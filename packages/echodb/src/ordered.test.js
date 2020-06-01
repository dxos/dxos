import { DefaultOrderedModel } from './ordered';

test('collects messages arriving in order', async () => {
  const model = new DefaultOrderedModel();
  await model.processMessages([
    { messageId: 1, previousMessageId: 0 },
    { messageId: 2, previousMessageId: 1 },
    { messageId: 3, previousMessageId: 2 },
    { messageId: 4, previousMessageId: 3 }
  ]);

  expect(model.messages).toStrictEqual([
    { messageId: 1, previousMessageId: 0 },
    { messageId: 2, previousMessageId: 1 },
    { messageId: 3, previousMessageId: 2 },
    { messageId: 4, previousMessageId: 3 }
  ]);
});

test('collects messages arriving out of order', async () => {
  const model = new DefaultOrderedModel();
  await model.processMessages([
    { messageId: 1, previousMessageId: 0 },
    { messageId: 3, previousMessageId: 2 },
    { messageId: 4, previousMessageId: 3 },
    { messageId: 2, previousMessageId: 1 }
  ]);

  expect(model.messages).toStrictEqual([
    { messageId: 1, previousMessageId: 0 },
    { messageId: 2, previousMessageId: 1 },
    { messageId: 3, previousMessageId: 2 },
    { messageId: 4, previousMessageId: 3 }
  ]);
});

test('collects messages with genesis message arriving last', async () => {
  const model = new DefaultOrderedModel();
  await model.processMessages([
    { messageId: 2, previousMessageId: 1 },
    { messageId: 3, previousMessageId: 2 },
    { messageId: 4, previousMessageId: 3 },
    { messageId: 1, previousMessageId: 0 }
  ]);

  expect(model.messages).toStrictEqual([
    { messageId: 1, previousMessageId: 0 },
    { messageId: 2, previousMessageId: 1 },
    { messageId: 3, previousMessageId: 2 },
    { messageId: 4, previousMessageId: 3 }
  ]);
});

test('collects messages arriving out of order in different bunches', async () => {
  const model = new DefaultOrderedModel();
  await model.processMessages([
    { messageId: 1, previousMessageId: 0 },
    { messageId: 3, previousMessageId: 2 }
  ]);

  expect(model.messages).toStrictEqual([
    { messageId: 1, previousMessageId: 0 }
  ]);

  await model.processMessages([
    { messageId: 4, previousMessageId: 3 },
    { messageId: 2, previousMessageId: 1 }
  ]);

  expect(model.messages).toStrictEqual([
    { messageId: 1, previousMessageId: 0 },
    { messageId: 2, previousMessageId: 1 },
    { messageId: 3, previousMessageId: 2 },
    { messageId: 4, previousMessageId: 3 }
  ]);
});

test('forks are resolved by picking the first candidate', async () => {
  const model = new DefaultOrderedModel();
  await model.processMessages([
    { messageId: 1, previousMessageId: 0 },
    { messageId: 2, previousMessageId: 1, value: 'a' },
    { messageId: 2, previousMessageId: 1, value: 'b' }
  ]);

  expect(model.messages).toStrictEqual([
    { messageId: 1, previousMessageId: 0 },
    { messageId: 2, previousMessageId: 1, value: 'a' }
  ]);
});

class ModelWithValidation extends DefaultOrderedModel {
  validateCandidate (_intendedPosition, _message) {
    return _intendedPosition === 0 || _message.value === 'b';
  }
}

test('models can add custom validation rules', async () => {
  const model = new ModelWithValidation();
  await model.processMessages([
    { messageId: 1, previousMessageId: 0 },
    { messageId: 2, previousMessageId: 1, value: 'a' },
    { messageId: 2, previousMessageId: 1, value: 'b' }
  ]);

  expect(model.messages).toStrictEqual([
    { messageId: 1, previousMessageId: 0 },
    { messageId: 2, previousMessageId: 1, value: 'b' }
  ]);
});
