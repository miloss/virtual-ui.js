(function (_) {
    function TreeNode() {
    }

    TreeNode._Change = {
        ExpandedSet: 1,
        ExpandedRemoved: 2
    };

    TreeNode.prototype.parent = null;
    TreeNode.prototype.previous = null;
    TreeNode.prototype.next = null;
    TreeNode.prototype.firstChild = null;
    TreeNode.prototype.lastChild = null;
    TreeNode.prototype.expanded = false;

    /**
     * Accept a visitor on this container's children
     * @param {Function} visitor
     * @param {Boolean} visibleOnly
     * @param {Boolean} reverse - walk through children in reverse order
     * @param {Boolean} any - if true, all the children will be processed,
     * and if the result of one child is true, the overall result will be true
     * @return {Boolean}
     * @version 1.0
     */
    TreeNode.prototype.acceptChildren = function (visitor, visibleOnly, reverse, any) {
        var res = !any;
        if (!visibleOnly || this.expanded) {
            var childRes;
            if (reverse) {
                for (var child = this.lastChild; child != null; child = child.previous) {
                    childRes = child.accept(visitor, visibleOnly, reverse, any);
                    if (childRes === false && !any) {
                        return false;
                    } else if (childRes === true && any) {
                        res = true;
                    }
                }
            } else {
                for (var child = this.firstChild; child != null; child = child.next) {
                    childRes = child.accept(visitor, visibleOnly, reverse, any);
                    if (childRes === false && !any) {
                        return false;
                    } else if (childRes === true && any) {
                        res = true;
                    }
                }
            }
        }
        return res;
    };

    /**
     * Accept a visitor
     * @param {Function} visitor a visitor function called for each visit retrieving the current
     * node as first parameter. The function may return a boolean value indicating whether to
     * return visiting (true) or whether to cancel visiting (false). Not returning anything or
     * returning anything else than a Boolean will be ignored.
     * @param {Boolean} visibleOnly
     * @param {Boolean} reverse - walk through children in reverse order
     * @param {Boolean} any - if true, all the children will be processed,
     * and if the result of one child is true, the overall result will be true
     * @return {Boolean} result of visiting (false = canceled, true = went through)
     */
    TreeNode.prototype.accept = function (visitor, visibleOnly, reverse, any) {
        if (visitor.call(null, this) === false) {
            return false;
        }

        return this.acceptChildren(visitor, visibleOnly, reverse, any);
    };

    TreeNode.prototype.getNestLevel = function () {
        var level = 0;
        for (var parent = this.parent; parent != null && (parent instanceof TreeNode); parent = parent.parent) {
            ++level;
        }
        return level;
    };

    TreeNode.prototype.handleChange = function (change, node) {
        if (change == TreeNode._Change.ExpandedSet || change == TreeNode._Change.ExpandedRemoved) {
            if (this.parent) {
                this.parent.handleChange(change, node);
            }
        }
    };

    TreeNode.prototype.handleExpand = function (e) {
        if (e.target.id === VTree.COLLAPSE_ID && this.expanded) {
            this.expanded = false;
            this.handleChange(TreeNode._Change.ExpandedSet, this);
        } else if (e.target.id === VTree.EXPAND_ID && !this.expanded) {
            this.expanded = true;
            this.handleChange(TreeNode._Change.ExpandedRemoved, this);
        }
    };

    TreeNode.prototype.getNodeCount = function () {
        var i = 0;
        this.accept(function(node){
            ++i;
            return true;
        }, false);
        return i;
    };

    function VTree(container, renderer, nodeStyle, expandRenderer, expandStyle) {
        // Note: initialization order is important here
        container.style.overflow = 'scroll';
        this._containerWidth = parseInt(container.clientWidth);
        this._root = new TreeNode();
        this._root.expanded = true;
        this._root.parent = this;

        VList.call(this, container, renderer, 0, 0);

        var testRow = document.createElement('div');
        this._rowStyle = nodeStyle ? nodeStyle : VTree.DEFAULT_ROW_STYLE;
        this._freeHeight = VTree.DEFAULT_FREEZONE_HEIGHT;
        this._insertIntoStyle = VTree.DEFAULT_INSERTINTO_STYLE;
        this._upSeparatorStyle = VTree.DEFAULT_UP_SEPARATOR_STYLE;
        this._downSeparatorStyle = VTree.DEFAULT_DOWN_SEPARATOR_STYLE;

        testRow.classList.add(this._rowStyle);
        testRow.style.display = 'none';
        container.appendChild(testRow);
        var style = getComputedStyle(testRow);

        var padding = parseInt(style.paddingLeft);
        this._paddingLeft = padding ? padding : VTree.DEFAULT_PADDING;

        var lineHeight = parseInt(style.lineHeight);
        this._rowHeight = lineHeight ? lineHeight : VTree.DEFAULT_LINE_HEIGHT;

        var testDownSep = document.createElement('div');
        testDownSep.classList.add(this._downSeparatorStyle);
        testDownSep.style.display = 'none';
        testRow.appendChild(testDownSep);
        this._downSepHeight = parseInt(getComputedStyle(testDownSep).height);

        container.removeChild(testRow);

        if (expandStyle) {
            this._expandStyle = expandStyle;
        }

        if (expandRenderer) {
            this._expandRenderer = expandRenderer;
        }
    }

    VTree.DEFAULT_ROW_STYLE = 'vrow';
    VTree.DEFAULT_PADDING = 50;
    VTree.DEFAULT_LINE_HEIGHT = 30;
    VTree.DEFAULT_FREEZONE_HEIGHT = 7;
    VTree.DEFAULT_UP_SEPARATOR_STYLE = 'up-separator';
    VTree.DEFAULT_DOWN_SEPARATOR_STYLE = 'down-separator';
    VTree.DEFAULT_INSERTINTO_STYLE = 'insertInto';

    VTree.COLLAPSE_ID = "clpsId";
    VTree.EXPAND_ID = "xpndId";
    VTree.ROW_ID = "rowId";
    VTree.LOWER_SEP_ID = "lsepId";
    VTree.UPPER_SEP_ID = "usepId";

    VTree.prototype = Object.create(VList.prototype);

    VTree.IdxIterator = function (vtree, firstIdx, lastIdx, visibleOnly) {
        this._vtree = vtree;
        this._firstIdx = firstIdx ? firstIdx : 1;
        if (visibleOnly) {
            this._lastIdx = lastIdx && lastIdx <= this._vtree._rowCount ? lastIdx : this._vtree._rowCount;
        } else {
            this._lastIdx = lastIdx && lastIdx <= this._vtree._nodeCount ? lastIdx : this._vtree._nodeCount;
        }
        this._visibleOnly = !!visibleOnly;
    };

    VTree.IdxIterator.prototype._vtree = null;
    VTree.IdxIterator.prototype._firstIdx = 0;
    VTree.IdxIterator.prototype._lastIdx = 0;
    VTree.IdxIterator.prototype._visibleOnly = false;
    VTree.IdxIterator.prototype._curNode = null;
    VTree.IdxIterator.prototype._curIdx = 0;

    VTree.IdxIterator.prototype.getFirstNode = function () {
        if (this._firstIdx <= this._lastIdx) {
            this._curIdx = this._firstIdx;
            this._curNode = this._vtree._getNodeByIdx(this._curIdx, this._visibleOnly);
        } else {
            this._curIdx = this._lastIdx + 1;
            this._curNode = null;
        }
        return this._curNode;
    };

    VTree.IdxIterator.prototype.getNext = function () {
        if (!this._curIdx) {
            return this.getFirstNode();
        }

        this._curIdx = this._curIdx <= this._lastIdx ? this._curIdx + 1 : this._curIdx;

        if (this._curIdx <= this._lastIdx && this._curNode) {
            this._curNode = this._vtree.getNextNode(this._curNode, this._visibleOnly);
        } else {
            this._curNode = null;
        }
        return this._curNode;
    };

    VTree.prototype._root = null;
    /**
     * The number of nodes in the vtree. Root node is not counted
     * @type {Number}
     * @private
     */
    VTree.prototype._nodeCount = 0;
    VTree.prototype._rowStyle = null;
    VTree.prototype._paddingLeft = 0;
    VTree.prototype._containerWidth = 0;
    VTree.prototype._expandedWidth = 0;
    VTree.prototype._expandStyle = null;
    VTree.prototype._dragNode = null;
    VTree.prototype._freeHeight = 0;
    VTree.prototype._upSeparatorStyle = null;
    VTree.prototype._downSeparatorStyle = null;
    VTree.prototype._insertIntoStyle = null;
    VTree.prototype._downSepHeight = 0;

    /** override */
    VTree.prototype.endUpdate = function () {
        if (--this._updateCounter === 0) {
            this.invalidate();
        }
    };

    VTree.prototype.requestInvalidation = function () {
        if (!this._updateCounter) {
            this.invalidate();
        }
    };

    VTree.prototype.handleChange = function (change, node) {
        if (change == TreeNode._Change.ExpandedSet || change == TreeNode._Change.ExpandedRemoved) {
            this.requestInvalidation();
        }
    };

    VTree.prototype.invalidate = function () {
        this._updateRowCount();
        this._updateScroller();

        if (this._scrollTimerId === null) {
            this._scrollTimerId = setTimeout(function () {
                if (Date.now() - this._lastCleanedTime > 100) {
                    this._cleanViewport();
                    this._lastCleanedTime = Date.now();
                }
                this._scrollTimerId = null;
            }.bind(this), 300);
        }

        this._render();
        this._lastRenderScrollTop = this._container.scrollTop;
    };

    VTree.prototype.appendNode = function (parent, node) {
        return this._insertNodeBefore(parent || this._root, null, node);
    };

    VTree.prototype.insertNodeBefore = function (reference, node) {
        return this._insertNodeBefore(reference.parent, reference, node);
    };

    VTree.prototype.insertNodeAfter = function (reference, node) {
        return this._insertNodeBefore(reference.parent, reference.next ? reference.next : null, node);
    };

    VTree.prototype.removeNode = function (node) {
        if (node.parent.firstChild == node) {
            node.parent.firstChild = node.next;
        }

        if (node.parent.lastChild == node) {
            node.parent.lastChild = node.previous;
        }

        if (node.previous != null) {
            node.previous.next = node.next;
        }

        if (node.next != null) {
            node.next.previous = node.previous;
        }

        var parent = node.parent;
        node.parent = null;
        node.previous = null;
        node.next = null;

        if (node.firstChild) {
            this._nodeCount -= node.getNodeCount();
        } else {
            --this._nodeCount;
        }
        if (node.expanded && node.firstChild) {
            this._updateRowCount();
        } else if (parent.expanded) {
            --this._rowCount;
        }
        if (parent.expanded && !parent.firstChild) {
            parent.expanded = false;
            parent.handleChange(TreeNode._Change.ExpandedRemoved, parent);
        }

        if (parent.expanded) {
            this.requestInvalidation();
        }
    };

    VTree.prototype._insertNodeBefore = function (parent, reference, child) {
        child.parent = parent;
        if (reference != null) {
            child.next = reference;
            child.previous = reference.previous;
            reference.previous = child;
            if (child.previous == null) {
                parent.firstChild = child;
            } else {
                child.previous.next = child;
            }
        }
        else {
            if (parent.lastChild != null) {
                child.previous = parent.lastChild;
                parent.lastChild.next = child;
                parent.lastChild = child;
            }
            child.next = null;
        }

        if (parent.firstChild == null) {
            parent.firstChild = child;
            child.previous = null;
            child.next = null;
        }

        if (child.next == null) {
            parent.lastChild = child;
        }

        if (child.firstChild) {
            this._nodeCount += child.getNodeCount();
        } else {
            ++this._nodeCount;
        }

        if (child.expanded && child.firstChild) {
            this._updateRowCount();
        } else if (parent.expanded) {
            ++this._rowCount;
        }

        if (parent.expanded || !parent.expanded && parent.firstChild == parent.lastChild) {
            // redraw
            this.requestInvalidation();
        }

        return this;
    };

    /** override */
    VList.prototype._updateScroller = function () {
        this._scroller.style.height = (this._rowCount * this._rowHeight + this._freeHeight).toString() + 'px';
    };

    /** override */
    VTree.prototype._renderViewport = function (index) {
        if (this._rowCount && this._renderer && this._rowHeight) {
            var lastIndex = Math.min(this._rowCount, index + this._cachedRows);
            var fragment = document.createDocumentFragment();

            var it = new VTree.IdxIterator(this, index + 1, lastIndex, true);
            var i = index;
            for (var node = it.getFirstNode(); node != null; node = it.getNext(), ++i) {
                var row = document.createElement('div');
                row.id = VTree.ROW_ID;
                row.classList.add(this._rowStyle);
                row.style.top = (i * this._rowHeight).toString() + 'px';
                var padding = this._paddingLeft * (node.getNestLevel() - 1);
                row.style.paddingLeft = padding.toString() + 'px';
                // TODO: calculate and use this._expandedWidth
                var width = this._containerWidth > padding ? this._containerWidth - padding : this._expandedWidth;
                row.style.width = width.toString() + 'px';
                if (node.expanded || node.firstChild) {
                    var expandElem = document.createElement('span');
                    if (node.expanded) {
                        expandElem.id = VTree.COLLAPSE_ID;
                    } else { // node.firstChild
                        expandElem.id = VTree.EXPAND_ID;
                    }
                    if (this._expandStyle) {
                        expandElem.classList.add(this._expandStyle);
                    }
                    this._expandRenderer(expandElem);
                    row.appendChild(expandElem);
                    row.addEventListener('click', node.handleExpand.bind(node));
                }
                row.setAttribute('draggable', true);
                row.addEventListener('dragstart', this.nodeDragStart.bind(this, node));
                row.addEventListener('dragenter', this.nodeDragEnter.bind(this, node));
                row.addEventListener('dragover', this.nodeDragOver.bind(this, node));
                row.addEventListener('dragleave', this.nodeDragLeave.bind(this, node));
                row.addEventListener('drop', this.nodeDrop.bind(this, node));
                row._specCounter = 0;
                this._renderer(node, row);
                fragment.appendChild(row);
            }

            if (lastIndex == this._rowCount) {
                var freeZone = document.createElement('div');
                freeZone.style.position = 'absolute';
                freeZone.style.height = this._freeHeight.toString() + 'px';
                freeZone.style.top = (lastIndex * this._rowHeight).toString() + 'px';
                freeZone.style.width = this._containerWidth.toString() + 'px';
                freeZone.addEventListener('dragenter', this.nodeDragEnter.bind(this, this._root));
                freeZone.addEventListener('dragover', this.nodeDragOver.bind(this, this._root));
                freeZone.addEventListener('dragleave', this.nodeDragLeave.bind(this, this._root));
                freeZone.addEventListener('drop', this.nodeDrop.bind(this, this._root));
                fragment.appendChild(freeZone);
            }

            for (var j = 1, l = this._container.childNodes.length; j < l; j++) {
                this._container.childNodes[j].style.display = 'none';
                this._container.childNodes[j].setAttribute('data-clean', '');
            }

            this._container.appendChild(fragment);
        }
    };

    VTree.prototype._expandRenderer = function (elem) {
        if (elem.id === VTree.COLLAPSE_ID) {
            elem.innerHTML = '&#9660;';
        } else if (elem.id === VTree.EXPAND_ID) {
            elem.innerHTML = '&#9658;';
        }
    };

    VTree.prototype._updateRowCount = function () {
        var i = 0;
        this._root.acceptChildren(function(node){
            ++i;
            return true;
        }, true);
        this._rowCount = i;
    };

    VTree.prototype._getNodeByIdx = function (idx, visibleOnly) {
        var i = 0;
        var nodeRef = null;
        this._root.acceptChildren(function(node){
            ++i;
            if (i == idx) {
                nodeRef = node;
                return false;
            }
            return true;
        }, visibleOnly);
        return nodeRef;
    };

    VTree.prototype.getNextNode = function (node, visibleOnly) {
        var startNode = node;
        var nextNode = null;

        if (visibleOnly) {
            while ((startNode.parent instanceof TreeNode) && !startNode.parent.expanded) {
                // Normally, initial node should be visible and we should not get here
                startNode = startNode.parent;
            }
        }

        if (startNode.firstChild && (!visibleOnly || startNode.expanded)) {
            nextNode = startNode.firstChild;
        }

        if (!nextNode && startNode.next) {
            nextNode = startNode.next;
        }

        if (!nextNode) {
            for (var parentNode = startNode.parent;
                 !nextNode && (parentNode instanceof TreeNode) && parentNode !== this._root;
                 parentNode = parentNode.parent) {

                if (parentNode.next) {
                    nextNode = parentNode.next;
                }
            }
        }

        return nextNode;
    };

    VTree.prototype.nodeHasSomeParent = function (node, parNode) {
        var res = false;
        for (var prnt = node.parent; prnt && (prnt instanceof TreeNode) && !res; prnt = prnt.parent) {
            res = (prnt === parNode);
        }
        return res;
    };

    VTree.prototype.nodeDragStart = function (node, e) {
        this._dragNode = node;
    };

    VTree.prototype.nodeDragEnter = function (node, e) {
        e.preventDefault();
        this.updateMarks(node, e, true);
        return false;
    };

    VTree.prototype.nodeDragOver = function (node, e) {
        e.preventDefault();
        this.updateMarks(node, e, false);
        return false;
    };

    VTree.prototype.nodeDragLeave = function (node, e) {
        e.preventDefault();
        if (this._dropHereAllowed(node)) {
            if (!e.currentTarget._specCounter || e.currentTarget._specCounter <= 1) {
                e.currentTarget._specCounter = 0;
                e.currentTarget.classList.remove(this._insertIntoStyle);
                this.rowRemoveSep(e.currentTarget, VTree.LOWER_SEP_ID);
                this.rowRemoveSep(e.currentTarget, VTree.UPPER_SEP_ID);
            } else {
                --e.currentTarget._specCounter;
            }
        }
        return false;
    };

    VTree.prototype.nodeDrop = function (node, e) {
        e.currentTarget._specCounter = 0;
        if (this._dropHereAllowed(node)) {
            e.currentTarget.classList.remove(this._insertIntoStyle);
            this.rowRemoveSep(e.currentTarget, VTree.LOWER_SEP_ID);
            this.rowRemoveSep(e.currentTarget, VTree.UPPER_SEP_ID);

            if (this._dropUpperAllowed(node, e)) {
                this.beginUpdate();
                this.removeNode(this._dragNode);
                if (node !== this._root) {
                    this.insertNodeBefore(node, this._dragNode);
                } else {
                    // this._root node we may have only if release mouse on the free zone below all nodes,
                    // so just append it
                    this.appendNode(node, this._dragNode);
                }
                this._dragNode = null;
                this.endUpdate();
            } else if (this._dropLowerAllowed(node, e)) {
                this.beginUpdate();
                this.removeNode(this._dragNode);
                this.insertNodeAfter(node, this._dragNode);
                this._dragNode = null;
                this.endUpdate();
            } else if (this._dropInsideAllowed(node, e)){
                this.beginUpdate();
                this.removeNode(this._dragNode);
                this.appendNode(node, this._dragNode);
                this._dragNode = null;
                this.endUpdate();
            }
        }
        e.stopPropagation();
        return false;
    };

    VTree.prototype._dropHereAllowed = function (node) {
        return this._dragNode && this._dragNode !== node && !this.nodeHasSomeParent(node, this._dragNode);
    };

    VTree.prototype._dropUpperAllowed = function (node, e) {
        return e.offsetY <= this._freeHeight && node !== this._dragNode.next;
    };

    VTree.prototype._dropLowerAllowed = function (node, e) {
        return e.offsetY >= this._rowHeight - this._freeHeight && !node.expanded
            && node !== this._root && this._dragNode !== node.next;
    };

    VTree.prototype._dropInsideAllowed = function (node, e) {
        return !(this._dragNode.parent === node && node.lastChild === this._dragNode);
    };

    VTree.prototype.drawUpperSeparator = function (node, e) {
        var padding = node === this._root ? 0 : this._paddingLeft * (node.getNestLevel() - 1);
        this.rowAddSep(e.currentTarget, VTree.UPPER_SEP_ID, padding);
    };

    VTree.prototype.drawLowerSeparator = function (node, e) {
        var padding = this._paddingLeft * (node.getNestLevel() - 1);
        this.rowAddSep(e.currentTarget, VTree.LOWER_SEP_ID, padding);
    };

    VTree.prototype.updateMarks = function (node, e, updateCounter) {
        var row = e.currentTarget;
        if (this._dropHereAllowed(node)) {
            if (this._dropUpperAllowed(node, e)) {
                if (!this.rowHasSep(row, VTree.UPPER_SEP_ID)) {
                    this.rowRemoveSep(row, VTree.LOWER_SEP_ID);

                    row._specCounter = 0;
                    row.classList.remove(this._insertIntoStyle);

                    this.drawUpperSeparator(node, e);
                }
            } else if (this._dropLowerAllowed(node, e)) {
                if (!this.rowHasSep(row, VTree.LOWER_SEP_ID)) {
                    this.rowRemoveSep(row, VTree.UPPER_SEP_ID);

                    row._specCounter = 0;
                    row.classList.remove(this._insertIntoStyle);

                    this.drawLowerSeparator(node, e);
                }
            } else if (node !== this._root && this._dropInsideAllowed(node, e)) {
                this.rowRemoveSep(row, VTree.LOWER_SEP_ID);
                this.rowRemoveSep(row, VTree.UPPER_SEP_ID);
                row.classList.add(this._insertIntoStyle);
                if (updateCounter) {
                    if (!row._specCounter) {
                        row._specCounter = 1;
                    } else {
                        ++row._specCounter;
                    }
                }
            }
        }
    };

    VTree.prototype.rowHasSep = function (row, sepId) {
        for (var j = 1, l = row.childNodes.length; j < l; j++) {
            if (row.childNodes[j].id === sepId) {
                return true;
            }
        }
        return false;
    };

    VTree.prototype.rowAddSep = function (row, sepId, padding) {
        var sep = document.createElement('div');
        sep.id = sepId;
        // TODO: calculate and use this._expandedWidth
        var width = this._containerWidth > padding ? this._containerWidth - padding : this._expandedWidth;
        if (sepId == VTree.UPPER_SEP_ID) {
            sep.classList.add(this._upSeparatorStyle);
            sep.style.top = '0px';
            sep.style.width = width.toString() + 'px';
            row.insertBefore(sep, row.firstChild);
        } else {
            sep.classList.add(this._downSeparatorStyle);
            sep.style.top = (this._rowHeight - this._downSepHeight).toString() + 'px';
            sep.style.width = width.toString() + 'px';
            row.appendChild(sep);
        }
    };

    VTree.prototype.rowRemoveSep = function (row, sepId) {
        for (var l = row.childNodes.length, j = l - 1; j >= 0; --j) {
            if (row.childNodes[j].id === sepId) {
                row.removeChild(row.childNodes[j]);
            }
        }
    };

    _.TreeNode = TreeNode;
    _.VTree = VTree;
})(this);