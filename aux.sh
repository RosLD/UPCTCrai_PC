#!/bin/bash

rxc=$(ifconfig $1 |grep "RX packets")
c=0
for i in $rxc; do
	
	((c=$c+1))
	if [[ $c == 3  ]]
	then
		echo $i
	fi		
done

