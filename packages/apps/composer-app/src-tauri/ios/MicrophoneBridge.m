//
// Copyright 2026 Daniel Thompson-Yvetot
//

// Live microphone capture bridged into the webview.
//
// WebKit substitutes a synthetic capture device in the iOS Simulator, so `getUserMedia` there yields
// a live-looking track that carries no sound — transcription runs end to end and transcribes silence.
// Native code does reach the host microphone, so capture happens here and the samples are handed to
// the page, which feeds them back into the Web Audio graph behind a `getUserMedia` shim.
//
// Development aid: on a real device WebKit captures correctly and the bridge stays dormant. It is
// started explicitly by the page (see `dxos_mic_bridge_start`), never on its own.

#import <AVFoundation/AVFoundation.h>
#import <Foundation/Foundation.h>
#import <WebKit/WebKit.h>

/// Sample rate the transcription pipeline expects; the engine's own rate is converted to it.
static const double kBridgeSampleRate = 16000.0;

/// Slack frames on top of the rate-scaled capacity, covering the converter's internal buffering.
static const AVAudioFrameCount kBridgeCapacitySlack = 32;

@interface DXOSMicrophoneBridge : NSObject
@property(nonatomic, strong) AVAudioEngine *engine;
@property(nonatomic, strong) AVAudioConverter *converter;
@property(nonatomic, strong) AVAudioFormat *outputFormat;
@property(nonatomic, weak) WKWebView *webView;
+ (instancetype)shared;
- (BOOL)start;
- (void)stop;
@end

@implementation DXOSMicrophoneBridge

+ (instancetype)shared {
  static DXOSMicrophoneBridge *shared = nil;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    shared = [[DXOSMicrophoneBridge alloc] init];
  });
  return shared;
}

/// Depth-first search for the webview; the app has exactly one, created by Tauri after launch.
+ (WKWebView *)findWebView:(UIView *)view {
  if ([view isKindOfClass:[WKWebView class]]) {
    return (WKWebView *)view;
  }
  for (UIView *subview in view.subviews) {
    WKWebView *found = [self findWebView:subview];
    if (found) {
      return found;
    }
  }
  return nil;
}

- (WKWebView *)resolveWebView {
  if (self.webView) {
    return self.webView;
  }
  for (UIWindow *window in UIApplication.sharedApplication.windows) {
    WKWebView *found = [DXOSMicrophoneBridge findWebView:window];
    if (found) {
      self.webView = found;
      return found;
    }
  }
  return nil;
}

- (BOOL)start {
  if (self.engine.isRunning) {
    return YES;
  }

  // PlayAndRecord rather than Record: the webview may also be playing audio, and Record would
  // silence it. Setting the category is what makes an input route available at all.
  NSError *sessionError = nil;
  AVAudioSession *session = AVAudioSession.sharedInstance;
  if (![session setCategory:AVAudioSessionCategoryPlayAndRecord
                withOptions:AVAudioSessionCategoryOptionDefaultToSpeaker | AVAudioSessionCategoryOptionAllowBluetooth
                      error:&sessionError]) {
    NSLog(@"[MicrophoneBridge] category failed: %@", sessionError);
    return NO;
  }
  if (![session setActive:YES error:&sessionError]) {
    NSLog(@"[MicrophoneBridge] activation failed: %@", sessionError);
    return NO;
  }

  self.engine = [[AVAudioEngine alloc] init];
  AVAudioInputNode *input = self.engine.inputNode;
  AVAudioFormat *inputFormat = [input outputFormatForBus:0];

  // The engine runs at the hardware rate; the pipeline wants 16 kHz mono, so convert rather than
  // resampling in JavaScript.
  self.outputFormat = [[AVAudioFormat alloc] initWithCommonFormat:AVAudioPCMFormatFloat32
                                                       sampleRate:kBridgeSampleRate
                                                         channels:1
                                                      interleaved:NO];
  self.converter = [[AVAudioConverter alloc] initFromFormat:inputFormat toFormat:self.outputFormat];
  if (!self.converter) {
    NSLog(@"[MicrophoneBridge] no converter for %@", inputFormat);
    [self abortStart];
    return NO;
  }

  __weak DXOSMicrophoneBridge *weakSelf = self;
  [input installTapOnBus:0
              bufferSize:4096
                  format:inputFormat
                   block:^(AVAudioPCMBuffer *buffer, AVAudioTime *when) {
                     [weakSelf deliver:buffer];
                   }];

  NSError *engineError = nil;
  if (![self.engine startAndReturnError:&engineError]) {
    NSLog(@"[MicrophoneBridge] engine failed: %@", engineError);
    [input removeTapOnBus:0];
    [self abortStart];
    return NO;
  }

  NSLog(@"[MicrophoneBridge] started at %.0f Hz", inputFormat.sampleRate);
  return YES;
}

/// Failure path once the session is active: leaving PlayAndRecord engaged would keep the device's
/// audio re-routed for an app that is not capturing.
- (void)abortStart {
  self.engine = nil;
  self.converter = nil;
  self.outputFormat = nil;
  [AVAudioSession.sharedInstance setActive:NO
                               withOptions:AVAudioSessionSetActiveOptionNotifyOthersOnDeactivation
                                     error:nil];
}

- (void)stop {
  if (!self.engine) {
    return;
  }
  [self.engine.inputNode removeTapOnBus:0];
  [self.engine stop];
  self.engine = nil;
  self.converter = nil;
  [AVAudioSession.sharedInstance setActive:NO
                               withOptions:AVAudioSessionSetActiveOptionNotifyOthersOnDeactivation
                                     error:nil];
  NSLog(@"[MicrophoneBridge] stopped");
}

/// Converts one tap buffer to 16 kHz mono and hands it to the page as base64 Float32.
- (void)deliver:(AVAudioPCMBuffer *)buffer {
  AVAudioConverter *converter = self.converter;
  AVAudioFormat *outputFormat = self.outputFormat;
  if (!converter || !outputFormat) {
    return;
  }

  // Sized so the whole tap buffer fits in one conversion; a fixed capacity would truncate the
  // callback whenever the hardware rate drops toward 16 kHz (e.g. a Bluetooth HFP route).
  AVAudioFrameCount capacity =
      (AVAudioFrameCount)ceil(buffer.frameLength * (kBridgeSampleRate / buffer.format.sampleRate)) +
      kBridgeCapacitySlack;
  AVAudioPCMBuffer *converted = [[AVAudioPCMBuffer alloc] initWithPCMFormat:outputFormat
                                                             frameCapacity:capacity];
  __block BOOL consumed = NO;
  NSError *error = nil;
  AVAudioConverterOutputStatus status = [converter
      convertToBuffer:converted
                error:&error
   withInputFromBlock:^AVAudioBuffer *_Nullable(AVAudioPacketCount count, AVAudioConverterInputStatus *status) {
     // The tap buffer is offered once; returning it again would loop the same audio forever.
     if (consumed) {
       *status = AVAudioConverterInputStatus_NoDataNow;
       return nil;
     }
     consumed = YES;
     *status = AVAudioConverterInputStatus_HaveData;
     return buffer;
   }];

  if (status == AVAudioConverterOutputStatus_Error || converted.frameLength == 0) {
    return;
  }

  const float *samples = converted.floatChannelData[0];
  NSData *data = [NSData dataWithBytes:samples length:converted.frameLength * sizeof(float)];
  NSString *encoded = [data base64EncodedStringWithOptions:0];

  dispatch_async(dispatch_get_main_queue(), ^{
    WKWebView *webView = [self resolveWebView];
    if (!webView) {
      return;
    }
    // A CustomEvent rather than a return value: delivery is continuous and one-way, and this is the
    // same channel `KeyboardHandler.m` already uses to push native events into the page.
    NSString *script =
        [NSString stringWithFormat:@"window.dispatchEvent(new CustomEvent('dxos-mic-chunk',{detail:'%@'}))", encoded];
    [webView evaluateJavaScript:script completionHandler:nil];
  });
}

@end

#pragma mark - C entry points

BOOL dxos_mic_bridge_start(void) {
  __block BOOL started = NO;
  if (NSThread.isMainThread) {
    started = [[DXOSMicrophoneBridge shared] start];
  } else {
    dispatch_sync(dispatch_get_main_queue(), ^{
      started = [[DXOSMicrophoneBridge shared] start];
    });
  }
  return started;
}

void dxos_mic_bridge_stop(void) {
  if (NSThread.isMainThread) {
    [[DXOSMicrophoneBridge shared] stop];
  } else {
    dispatch_sync(dispatch_get_main_queue(), ^{
      [[DXOSMicrophoneBridge shared] stop];
    });
  }
}
