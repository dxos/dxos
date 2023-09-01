#!/bin/sh

export PROFILE=$1;

OBJECTS=100;
MUTATIONS=10000;

echo "[$PROFILE]: init";
echo "[$PROFILE]: $(DX_PROFILE=$PROFILE dx agent start)";
# echo "[$PROFILE]: $(DX_PROFILE=$PROFILE dx reset --force)";
# echo "[$PROFILE]: $(DX_PROFILE=$PROFILE dx halo create $PROFILE)";
# echo "[$PROFILE]: $(DX_PROFILE=$PROFILE dx halo identity)";
# echo "[$PROFILE]: $(DX_PROFILE=$PROFILE dx space create testSpaces)";
# echo "[$PROFILE]: generating";
# echo "[$PROFILE]: $(DX_PROFILE=$PROFILE dx debug generate "04" --objects=$OBJECTS --mutations=$MUTATIONS) genereated $OBJECTS objects with $MUTATIONS mutations";
