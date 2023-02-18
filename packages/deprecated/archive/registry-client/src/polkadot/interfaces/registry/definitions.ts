//
// Copyright 2021 DXOS.org
//

export default {
  types: {
    Domain: {
      name: 'Option<Text>',
      owner: 'AccountKey'
    },
    Auction: {
      name: 'Vec<u8>',
      highest_bidder: 'AccountId',
      highest_bid: 'u128',
      end_block: 'BlockNumber',
      closed: 'bool'
    },
    Record: {
      data: 'Vec<u8>'
    },
    Multihash: '[u8; 34]',
    DomainKey: '[u8; 32]',
    AccountKey: '[u8; 32]',
    Resource: {
      versions: 'BTreeMap<Text, Multihash>',
      tags: 'BTreeMap<Text, Multihash>'
    },
    Account: {
      devices: 'Vec<AccountId>'
    }
  }
};
