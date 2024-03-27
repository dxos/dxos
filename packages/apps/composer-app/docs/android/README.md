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
