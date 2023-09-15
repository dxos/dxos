import { PublicKey } from "@dxos/keys";
import { numericalValues, randomInt, range } from "@dxos/util";
import { test } from '@dxos/test';
import {expect} from 'chai'

describe('feed key compression', () => {
  test.only('random invitations', () => {
    const NUM_PEERS = 1000; // 2 feeds per peer.

    const feeds: number[][] = [] // feedId -> listOfAdmittedFeeds

    for(const idx of range(NUM_PEERS)) {
      const controlFeed = feeds.push([]) - 1;
      const dataFeed = feeds.push([]) - 1;

      feeds[controlFeed].push(dataFeed);

      if(idx === 0) {
        continue;
      }

      const inviter = randomInt((idx - 1) / 8, 0);
      feeds[inviter * 2].push(controlFeed);
    }

    const values = new Set<string>();
    for(const feed of range(NUM_PEERS * 2)) {
      const chain = getAdmissionChain(feeds, feed);

      const resultingFeed = chain.reduce((currentFeed, ordinal) => feeds[currentFeed][ordinal], 0);
      expect(resultingFeed).to.eq(feed);

      expect(!values.has(JSON.stringify(chain))).to.eq(true);
      values.add(JSON.stringify(chain));
    }

    const keySet = new Set<string>();
    for(const feed of range(NUM_PEERS * 2)) {
      const key = encode(feeds, feed);
      const hex = Buffer.from(key).toString('hex');
      console.log(`${JSON.stringify(hex).padEnd(16)} - ${getAdmissionChain(feeds, feed)} ${keySet.has(hex) ? 'duplicate' : ''}`);
      keySet.add(hex);
    }

    console.log(numericalValues(Array.from(keySet).map(key => Buffer.from(key, 'hex').length), x => x));
  });
});

const encode = (admissions: number[][], feedIdx: number) => {
  const admissionChain = getAdmissionChain(admissions, feedIdx);

  const nibbles = [];

  for(const ordinal of admissionChain) {
    nibbles.push(...encodeNibbleVarint(ordinal + 1));
  }

  return concatNibbles(nibbles);
}

const getAdmissionChain = (admissions: number[][], feedIdx: number) => {
  let currentFeed = feedIdx;
  let admissionChain = [];
  while(true) {
    const admittedIn = admissions.findIndex(admission => admission.includes(currentFeed))
    if(admittedIn === -1) {
      break;
    }

    const admittedAt = admissions[admittedIn].findIndex(feed => feed === currentFeed);
    admissionChain.push(admittedAt);
    currentFeed = admittedIn;
  }

  return admissionChain.reverse();
}

const encodeNibbleVarint = (number: number) => {
  const nibbles = [];
  while(number > 0b111) {
    nibbles.push(number & 0b111 | 0b1000);
    number = number >> 3;
  }
  nibbles.push(number & 0b111);
  return nibbles;
}

const concatNibbles = (nibbles: number[]) => {
  const bytes = [];
  for(let i = 0; i < Math.ceil(nibbles.length / 2); i++) {
    if(i * 2 + 1 === nibbles.length) {
      bytes.push(nibbles[i * 2] << 4);
    } else {
      bytes.push(nibbles[i * 2] << 4 | nibbles[i * 2 + 1]);
    }
  }

  return new Uint8Array(bytes);
}