# Android Build tutorial

This tutorial is adapted from the official [Socket Android guide](https://socketsupply.co/guides/#mobile-guides_android).

## Requirements

To get started, Socket needs to be installed globally on your computer:

`npm i @socketsupply/socket -g`

After Socket is installed, you can run the setup command for Android, which will install all the needed Android developer tools:

`ssc setup --platform=android`

If you want to test the build on your Android device, then you will have to enable USB debugging on the device. Instructions on how to do this can be found [here](https://developer.android.com/studio/debug/dev-options). To test if your device is recognized, plug it into your computer by USB and run `ssc list-devices --platform=android`.

## Building

Navigate to the Composer directory:

`cd /packages/apps/composer-app`

Then run the command to build:

`ssc build -r -o --platform=android`

## Running the app on your device

First build, codesign and package the app:

`ssc build --platform=android -c -p`

Plug your device into your computer with USB and then run the install command:

`ssc install-app --platform=android`

## Running in an emulator

```bash
ssc build --platform=android-emulator -r
```

## Enabling other Android tools

To ensure `adb` is in the `$PATH`, use the following in your shell profile:

```bash
export ANDROID_HOME=/Users/$USER/Library/Android/sdk
export PATH="$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools"

```

To check which ABIs are supported by your device, ensure developer mode and usb debugging, then run:

```bash
adb shell getprop ro.product.cpu.abilist
```

Ensure the right abi is listed in `socket.ini` under 

```ini
[android]
native_abis = "armeabi-v7a"
```

### Reading android logs

```bash
# logs from all apps
adb logcat
# tagged logs
adb logcat -s YourTag
# filtered logs
adb logcat *:W
# where W is V, D, I, W, E, F, or S to filter by Verbose, Debug, Info, Warning, Error, Fatal, or Silent respectively.
```