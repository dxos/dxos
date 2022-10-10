#!/usr/bin/env node --enable-source-maps

import { run, flush, Errors } from '@oclif/core';

run(void 0, import.meta.url)
.then(flush)
.catch(Errors.handle);