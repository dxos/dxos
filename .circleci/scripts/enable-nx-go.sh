#!/usr/bin/env bash
jq '. += {"plugins": ["@nx-go/nx-go"]}' nx.json > nx.json.tmp && mv nx.json.tmp nx.json
