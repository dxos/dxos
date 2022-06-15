# DXOS Credentials

> DXOS credentials.

## Install

```
```

## Usage

```
```

## Contributing

PRs accepted.

## License

GPL-3.0 © DXOS.org


# Scratchpad

## HALO state machine

```protobuf
message Claim {
  PublicKey subject = 1;
  PublicKey service = 2;

  enum ClaimType {
    MEMBER_ADMIT = 1;
    FEED_ADMIT = 2;
  }
}

message ClaimList {
  repeated Claim claims = 1;
}

message Credential {
  // 
  ClaimList claims = 1;
}

```


```typescript



```