---
order: 100
---
# Troubleshooting

## OpenSSL issues
```error
Error: error:0308010C:digital envelope routines::unsupported
```

Linux and macOS (Windows Git Bash)-
```bash
export NODE_OPTIONS=--openssl-legacy-provider
```
Windows command prompt-
```cmd
set NODE_OPTIONS=--openssl-legacy-provider
```
Windows PowerShell-
```ps
$env:NODE_OPTIONS = "--openssl-legacy-provider"
```
Reference: [StackOverflow](https://stackoverflow.com/questions/69692842/error-message-error0308010cdigital-envelope-routinesunsupported)
