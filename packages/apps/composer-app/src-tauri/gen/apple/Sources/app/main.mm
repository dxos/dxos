#include "bindings/bindings.h"
#import <Foundation/Foundation.h>

int main(int argc, char * argv[]) {
	NSLog(@"[main] starting...");
	ffi::start_app();
	return 0;
}
