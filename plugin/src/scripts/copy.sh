#!/bin/bash

# ios static files
mkdir -p plugin/build/ios/static
cp -R plugin/src/ios/static/* plugin/build/ios/static/

# android static files
mkdir -p plugin/build/android/static
cp -R plugin/src/android/static/* plugin/build/android/static/
