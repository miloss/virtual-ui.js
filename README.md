VirtualUI.js
=============

This is a set of components that can virtually hold millions of items without creating separate DOM-Elements for each of them. The idea is that the virtual components will only keep a few dom-elements and update them accordingly to the current state like scroll positions and thus can hold millions of items on memory without any performance issues.

Get started
===========

Currently there're VList and VTree available. To see how they are used refer to the samples in src/vlist.html for the list and src/vtree.html for the tree.

This work is based on the previous work made by Copyright (C) 2013 Sergi Mansilla which can be found here: https://github.com/sergi/virtual-list
