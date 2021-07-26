//
// Copyright 2020 DxOS.
//

const ts_preset = require('ts-jest/presets/js-with-ts')
const puppeteer_preset = require('jest-puppeteer/jest-preset')

module.exports = Object.assign(
    ts_preset,
    puppeteer_preset
)