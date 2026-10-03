//
// Copyright 2026 DXOS.org
//

// Native passkey ceremonies for the iOS app (`src/passkey/ios.rs`).
//
// The webview's origin is `tauri://localhost`, so WebAuthn there can never reach a `composer.space`
// passkey; AuthenticationServices can, once the app carries `webcredentials:composer.space`.
//
// Every request settles exactly once, on the main thread: a newer request supersedes the one in flight
// rather than queueing behind it, so a system sheet that never answers cannot block later requests.

#import <AuthenticationServices/AuthenticationServices.h>
#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#include <stdbool.h>

/// Receives a request's outcome: `ok` with the result as JSON, or not `ok` with `{domain, code, message}`.
typedef void (*DXOSPasskeyCallback)(void *context, bool ok, const char *payload);

/// Errors raised by the bridge itself rather than by AuthenticationServices.
static NSString *const DXOSPasskeyErrorDomain = @"org.dxos.composer.passkey";
typedef NS_ENUM(NSInteger, DXOSPasskeyErrorCode) {
  DXOSPasskeyErrorSuperseded = 1,
  DXOSPasskeyErrorNoWindow = 2,
  DXOSPasskeyErrorEncoding = 3,
  DXOSPasskeyErrorUnexpectedCredential = 4,
};

static NSString *DXOSBase64URL(NSData *data) {
  NSString *encoded = [data base64EncodedStringWithOptions:0];
  encoded = [encoded stringByReplacingOccurrencesOfString:@"+" withString:@"-"];
  encoded = [encoded stringByReplacingOccurrencesOfString:@"/" withString:@"_"];
  return [encoded stringByReplacingOccurrencesOfString:@"=" withString:@""];
}

/// The window the system sheet attaches to: the key window of the foreground scene, else any window.
static UIWindow *DXOSPresentationWindow(void) {
  UIWindow *fallback = nil;
  for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
    if (![scene isKindOfClass:[UIWindowScene class]]) {
      continue;
    }
    for (UIWindow *window in ((UIWindowScene *)scene).windows) {
      if (window.isKeyWindow && scene.activationState == UISceneActivationStateForegroundActive) {
        return window;
      }
      fallback = fallback ?: window;
    }
  }
  return fallback;
}

@class DXOSPasskeyRequest;

/// The request whose sheet may be on screen; touched only on the main thread.
static DXOSPasskeyRequest *gInFlight = nil;

@interface DXOSPasskeyRequest
    : NSObject <ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding>
@property(nonatomic, strong) ASAuthorizationController *controller;
@property(nonatomic, strong) UIWindow *anchor;
@property(nonatomic, assign) DXOSPasskeyCallback callback;
@property(nonatomic, assign) void *context;
@property(nonatomic, assign) BOOL settled;
@end

@implementation DXOSPasskeyRequest

- (instancetype)initWithCallback:(DXOSPasskeyCallback)callback context:(void *)context {
  if ((self = [super init])) {
    _callback = callback;
    _context = context;
  }
  return self;
}

- (void)performRequest:(ASAuthorizationRequest *)request {
  if (gInFlight) {
    DXOSPasskeyRequest *previous = gInFlight;
    [previous failWithError:[NSError errorWithDomain:DXOSPasskeyErrorDomain
                                                code:DXOSPasskeyErrorSuperseded
                                            userInfo:@{NSLocalizedDescriptionKey : @"A newer passkey request replaced this one."}]];
    [previous.controller cancel];
  }

  self.anchor = DXOSPresentationWindow();
  if (!self.anchor) {
    [self failWithError:[NSError errorWithDomain:DXOSPasskeyErrorDomain
                                            code:DXOSPasskeyErrorNoWindow
                                        userInfo:@{NSLocalizedDescriptionKey : @"No window to present the passkey sheet from."}]];
    return;
  }

  gInFlight = self;
  self.controller = [[ASAuthorizationController alloc] initWithAuthorizationRequests:@[ request ]];
  self.controller.delegate = self;
  self.controller.presentationContextProvider = self;
  [self.controller performRequests];
}

- (void)settle:(BOOL)ok payload:(NSDictionary *)payload {
  if (self.settled) {
    return;
  }
  self.settled = YES;
  if (gInFlight == self) {
    gInFlight = nil;
  }

  NSError *error = nil;
  NSData *json = [NSJSONSerialization dataWithJSONObject:payload options:0 error:&error];
  if (!json) {
    ok = NO;
    json = [NSJSONSerialization
        dataWithJSONObject:@{@"domain" : DXOSPasskeyErrorDomain, @"code" : @(DXOSPasskeyErrorEncoding), @"message" : error.localizedDescription ?: @""}
                   options:0
                     error:nil];
  }
  NSString *string = [[NSString alloc] initWithData:json encoding:NSUTF8StringEncoding];
  self.callback(self.context, ok, string.UTF8String);
}

- (void)failWithError:(NSError *)error {
  [self settle:NO
       payload:@{@"domain" : error.domain, @"code" : @(error.code), @"message" : error.localizedDescription ?: @""}];
}

- (ASPresentationAnchor)presentationAnchorForAuthorizationController:(ASAuthorizationController *)controller {
  return self.anchor;
}

- (void)authorizationController:(ASAuthorizationController *)controller
    didCompleteWithAuthorization:(ASAuthorization *)authorization {
  id credential = authorization.credential;
  if ([credential isKindOfClass:[ASAuthorizationPlatformPublicKeyCredentialRegistration class]]) {
    ASAuthorizationPlatformPublicKeyCredentialRegistration *registration = credential;
    NSString *identifier = DXOSBase64URL(registration.credentialID);
    [self settle:YES
         payload:@{
           @"id" : identifier,
           @"raw_id" : identifier,
           @"client_data_json" : DXOSBase64URL(registration.rawClientDataJSON),
           @"attestation_object" : DXOSBase64URL(registration.rawAttestationObject ?: [NSData data]),
           @"prf_output" : @[],
         }];
  } else if ([credential isKindOfClass:[ASAuthorizationPlatformPublicKeyCredentialAssertion class]]) {
    ASAuthorizationPlatformPublicKeyCredentialAssertion *assertion = credential;
    NSString *identifier = DXOSBase64URL(assertion.credentialID);
    [self settle:YES
         payload:@{
           @"id" : identifier,
           @"raw_id" : identifier,
           @"client_data_json" : DXOSBase64URL(assertion.rawClientDataJSON),
           @"authenticator_data" : DXOSBase64URL(assertion.rawAuthenticatorData),
           @"signature" : DXOSBase64URL(assertion.signature),
           @"user_handle" : DXOSBase64URL(assertion.userID),
           @"prf_output" : @[],
         }];
  } else {
    [self failWithError:[NSError errorWithDomain:DXOSPasskeyErrorDomain
                                            code:DXOSPasskeyErrorUnexpectedCredential
                                        userInfo:@{NSLocalizedDescriptionKey : @"The system returned a credential that is not a passkey."}]];
  }
}

- (void)authorizationController:(ASAuthorizationController *)controller didCompleteWithError:(NSError *)error {
  [self failWithError:error];
}

@end

#pragma mark - Entry points

/// Inputs are copied before returning, so the caller may free them as soon as the call returns.
static void DXOSPasskeyRegister(const char *rp_id,
                                const uint8_t *challenge,
                                size_t challenge_len,
                                const char *username,
                                const uint8_t *user_id,
                                size_t user_id_len,
                                void *context,
                                DXOSPasskeyCallback callback) {
  NSString *rpId = [NSString stringWithUTF8String:rp_id];
  NSData *challengeData = [NSData dataWithBytes:challenge length:challenge_len];
  NSString *name = [NSString stringWithUTF8String:username];
  NSData *userId = [NSData dataWithBytes:user_id length:user_id_len];
  dispatch_async(dispatch_get_main_queue(), ^{
    ASAuthorizationPlatformPublicKeyCredentialProvider *provider =
        [[ASAuthorizationPlatformPublicKeyCredentialProvider alloc] initWithRelyingPartyIdentifier:rpId];
    ASAuthorizationRequest *request = [provider createCredentialRegistrationRequestWithChallenge:challengeData
                                                                                            name:name
                                                                                          userID:userId];
    [[[DXOSPasskeyRequest alloc] initWithCallback:callback context:context] performRequest:request];
  });
}

/// Inputs are copied before returning, so the caller may free them as soon as the call returns.
static void DXOSPasskeyLogin(const char *rp_id,
                             const uint8_t *challenge,
                             size_t challenge_len,
                             void *context,
                             DXOSPasskeyCallback callback) {
  NSString *rpId = [NSString stringWithUTF8String:rp_id];
  NSData *challengeData = [NSData dataWithBytes:challenge length:challenge_len];
  dispatch_async(dispatch_get_main_queue(), ^{
    ASAuthorizationPlatformPublicKeyCredentialProvider *provider =
        [[ASAuthorizationPlatformPublicKeyCredentialProvider alloc] initWithRelyingPartyIdentifier:rpId];
    ASAuthorizationRequest *request = [provider createCredentialAssertionRequestWithChallenge:challengeData];
    [[[DXOSPasskeyRequest alloc] initWithCallback:callback context:context] performRequest:request];
  });
}

typedef void (*DXOSPasskeyRegisterFn)(const char *, const uint8_t *, size_t, const char *, const uint8_t *, size_t,
                                      void *, DXOSPasskeyCallback);
typedef void (*DXOSPasskeyLoginFn)(const char *, const uint8_t *, size_t, void *, DXOSPasskeyCallback);

/// Defined by the app's Rust library (`src/passkey/ios.rs`), which Xcode links into this target.
extern void dxos_passkey_bridge_install(DXOSPasskeyRegisterFn register_fn, DXOSPasskeyLoginFn login_fn);

/// Runs as the app image loads, before Rust's `run` reads whether the bridge is present.
__attribute__((constructor)) static void DXOSPasskeyBridgeInstall(void) {
  dxos_passkey_bridge_install(DXOSPasskeyRegister, DXOSPasskeyLogin);
}
