'use strict'
var blake2b = require('./')

blake2b.ready(function () {
  var hash = blake2b()
    .update(Buffer.from('hello'))
    .update(Buffer.from(' '))
    .update(Buffer.from('world'))
    .digest('hex')

  console.log('Blake2b hash of "hello world" is %s', hash)
})

