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
        testRow.classList.add(this._rowStyle);
        testRow.style.display = 'none';
        container.appendChild(testRow);
        var style = getComputedStyle(testRow);
        var padding = parseInt(style.paddingLeft);
        this._paddingLeft = padding ? padding : VTree.DEFAULT_PADDING;
        var lineHeight = parseInt(style.lineHeight);
        this._rowHeight = lineHeight ? lineHeight : VTree.DEFAULT_LINE_HEIGHT;
        container.removeChild(testRow);

        if (expandStyle) {
            this._expandStyle = expandStyle;
        }

        if (expandRenderer) {
            this._expandRenderer = expandRenderer;
        }
    }

    VTree.DEFAULT_ROW_STYLE = 'vrow';
    VTree.DEFAULT_PADDING = 40;
    VTree.DEFAULT_LINE_HEIGHT = 35;

    VTree.COLLAPSE_ID = "clpsId";
    VTree.EXPAND_ID = "xpndId";
    VTree.ROW_ID = "rowId";

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
    VTree.prototype._paddingLeft = '0px';
    VTree.prototype._containerWidth = 0;
    VTree.prototype._expandedWidth = 0;
    VTree.prototype._expandStyle = null;
    VTree.prototype._dragNode = null;

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
                row.style.top = (i * this._rowHeight) + 'px';
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
                row.addEventListener('drop', this.nodeDropHere.bind(this, node));
                this._renderer(node, row);
                fragment.appendChild(row);
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
    };

    VTree.prototype.nodeDragOver = function (node, e) {
        e.preventDefault();
    };

    VTree.prototype.nodeDropHere = function (node, e) {
        e.preventDefault();
        if (this._dragNode && this._dragNode !== node && !this.nodeHasSomeParent(node, this._dragNode)) {
            this.beginUpdate();
            this.removeNode(this._dragNode);
            this.appendNode(node, this._dragNode);
            this._dragNode = null;
            this.endUpdate();
        }
    };

    _.TreeNode = TreeNode;
    _.VTree = VTree;
})(this);