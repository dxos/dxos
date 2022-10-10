//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { decrypt, encrypt } from './encrypt.js';

// Using JSON test data due to its popularity. Any text should work.
const testJsonData = `{"keys":[{"added":"2020-02-04T22:22:37-07:00","created":"2020-02-04T22:22:37-07:00","hint":false,
"key":"9d902af1d1d6f42e2c6736cea4191b05368f1df77181bc8d798d8db946c48cd4","own":true,"publicKey":"9d902af1d1d6f42e2c6736
cea4191b05368f1df77181bc8d798d8db946c48cd4","secretKey":"1fb50514ae9edb4cadc448a60f345f69459616f3ad5e9d74d5a8c920b8b5f7
409d902af1d1d6f42e2c6736cea4191b05368f1df77181bc8d798d8db946c48cd4","trusted":true,"type":"IDENTITY"},{"added":"2020-02
-04T22:22:37-07:00","created":"2020-02-04T22:22:37-07:00","hint":false,"key":"1a9cd591afb12920546c2e35ebc341dd54f30c261
90118998596991f3fd1af5c","own":true,"publicKey":"1a9cd591afb12920546c2e35ebc341dd54f30c26190118998596991f3fd1af5c","sec
retKey":"51885b933a7fc50f7e8e94b34336497b1030d7e5b112ad6c7721bc1f34766a4a1a9cd591afb12920546c2e35ebc341dd54f30c26190118
998596991f3fd1af5c","trusted":true,"type":"PSEUDONYM"},{"added":"2020-02-04T22:22:37-07:00","created":"2020-02-04T22:22
:37-07:00","hint":false,"key":"6047e56f37dfd50a24590acb861dd5095955fedbd87d133f06b576146a3305ab","own":true,"publicKey"
:"6047e56f37dfd50a24590acb861dd5095955fedbd87d133f06b576146a3305ab","secretKey":"6737bec794cc8547dc5062afe70c01522b94c0
d945729ff8cf9e9669d09366436047e56f37dfd50a24590acb861dd5095955fedbd87d133f06b576146a3305ab","trusted":true,"type":"DEVI
CE"},{"added":"2020-02-04T22:22:37-07:00","created":"2020-02-04T22:22:37-07:00","hint":false,"key":"2dd57ada7744cf5db66
d8183505086e9b3e1853e7af79857e443299abe103b58","own":true,"publicKey":"2dd57ada7744cf5db66d8183505086e9b3e1853e7af79857
e443299abe103b58","secretKey":"4c5c53e97267bcf295bb91eaaf83d69b619a3df195ec085b4ca7e41cbf88f2e12dd57ada7744cf5db66d8183
505086e9b3e1853e7af79857e443299abe103b58","trusted":true,"type":"DEVICE_IDENTITY"},{"added":"2020-02-04T22:22:37-07:00"
,"created":"2020-02-04T22:22:37-07:00","hint":false,"key":"6fbe6aacfd25e7324b7420f3d38b93316eed6097d58d261f6f802d33903b
b7c9","own":true,"publicKey":"6fbe6aacfd25e7324b7420f3d38b93316eed6097d58d261f6f802d33903bb7c9","secretKey":"67aeedd8fc
d0555d455097daafc777103697f96e3697847d30ea802057d4795f6fbe6aacfd25e7324b7420f3d38b93316eed6097d58d261f6f802d33903bb7c9"
,"trusted":true,"type":"DEVICE_PSEUDONYM"},{"added":"2020-02-04T22:22:37-07:00","created":"2020-02-04T22:22:37-07:00","
hint":false,"key":"0d7a22f56bc1e398a5611f592d6a41fcc0f93cf233437d5f3a7f760de2b2bc75","own":true,"publicKey":"0d7a22f56b
c1e398a5611f592d6a41fcc0f93cf233437d5f3a7f760de2b2bc75","secretKey":"279e5ee1ec0b45d3505ab8a3fc79f1b2d9f71667ac311e36e4
d237bca84e68920d7a22f56bc1e398a5611f592d6a41fcc0f93cf233437d5f3a7f760de2b2bc75","trusted":true,"type":"PARTY"},{"added"
:"2020-02-04T22:22:37-07:00","created":"2020-02-04T22:22:37-07:00","hint":false,"key":"c8e865ae089f4cb5add830b67fa676dd
c0e813f5333272633b305b359115a6b6","own":true,"publicKey":"c8e865ae089f4cb5add830b67fa676ddc0e813f5333272633b305b359115a
6b6","secretKey":"1a211268f48fe9fc4d6a294b320bc1f92a592631d0bbdb5c94a8a8626a150a2dc8e865ae089f4cb5add830b67fa676ddc0e81
3f5333272633b305b359115a6b6","trusted":true,"type":"FEED"},{"added":"2020-02-04T22:22:37-07:00","created":"2020-02-04T2
2:22:37-07:00","hint":false,"key":"4f5e87626c62c5f61873d1e7c995c1b7e7e66e7600b454fa370a93d18f4a9a6f","own":true,"public
Key":"4f5e87626c62c5f61873d1e7c995c1b7e7e66e7600b454fa370a93d18f4a9a6f","secretKey":"94a4ce17823895e25fa637ce6aa9ef9bcd
8c13d81376b61fb252db32d1002bba4f5e87626c62c5f61873d1e7c995c1b7e7e66e7600b454fa370a93d18f4a9a6f","trusted":true,"type":"
UNKNOWN"}]}';`;

it('Bulk encryption/decryption', function () {
  const original = testJsonData;

  const origCrypt = encrypt(original, 'secret12');
  const copy = decrypt(origCrypt, 'secret12');

  expect(original).to.equal(copy);
});
