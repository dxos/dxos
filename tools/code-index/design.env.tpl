# `op run --env-file tools/code-index/design.env.tpl -- <command>` resolves this reference into the
# environment; the code itself only ever reads TYPESAFE_API_KEY. Never put a value in this file.
TYPESAFE_API_KEY=op://CI/Typesafe AI Test Key/credential
