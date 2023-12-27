import { describe, test } from '@dxos/test';
import { tryParseOutline } from './parser';
import { Tree } from '@braneframe/types';
import { expect } from 'chai';
import { TextObject } from '@dxos/client/echo';

describe('outline parser', () => {
  test('should parse outline', () => {
    const outline = tryParseOutline(TEXT);

    expect(equivalent(outline!, EXPECTED)).to.be.true;
  });

  test('does not parse plain text', () => {
    const outline = tryParseOutline('plain text\n- bullet');

    expect(outline).to.be.undefined;
  })
});

// NOTE: Keep tabs intact.
const TEXT = `- Contacts
	- sync from space members to personal space
	- directed invitations
		- by sending a message on identity key topic
	- multiline bullets
	  are also allowed
- top level`;

const EXPECTED = [
  new Tree.Item({
    text: new TextObject('Contacts'),
    items: [
      new Tree.Item({
        text: new TextObject('sync from space members to personal space'),
      }),
      new Tree.Item({
        text: new TextObject('directed invitations'),
        items: [
          new Tree.Item({
            text: new TextObject('by sending a message on identity key topic'),
          }),
        ],
      }),
      new Tree.Item({
        text: new TextObject('multiline bullets\nare also allowed'),
      }),
    ],
  }),
  new Tree.Item({
    text: new TextObject('top level'),
  }),
];

const equivalent = (a: Tree.Item[], b: Tree.Item[]) => {
  if(a.length !== b.length) {
    console.log('length mismatch', a.length, b.length)
    return false;
  }

  for(let i = 0; i < a.length; i++) {
    if(a[i].text.text !== b[i].text.text) {
      console.log('text mismatch', a[i].text.text, b[i].text.text)
      return false;
    }
    if(!equivalent(a[i].items, b[i].items)) return false;
  }

  return true;
}