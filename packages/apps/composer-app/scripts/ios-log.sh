#!/bin/bash

log stream --predicate 'process == "Composer"' --level debug 2>&1 | grep "\[KeyboardHandler\]"
