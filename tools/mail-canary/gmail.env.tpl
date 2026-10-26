# `op run --env-file tools/mail-canary/gmail.env.tpl -- <command>` resolves these references into the
# environment; scripts/02-import-pool.sh does so when no other grant is set. Never put a value in this file.
GMAIL_CLIENT_ID=op://eng-dev/com.google/mail-canary/GMAIL_CLIENT_ID
GMAIL_CLIENT_SECRET=op://eng-dev/com.google/mail-canary/GMAIL_CLIENT_SECRET
GMAIL_REFRESH_TOKEN=op://eng-dev/com.google/mail-canary/GMAIL_REFRESH_TOKEN
