(function (_) {
    function TreeNode() {
    }

    TreeNode.prototype.parent = null;
    TreeNode.prototype.previous = null;
    TreeNode.prototype.next = null;
    TreeNode.prototype.firstChild = null;
    TreeNode.prototype.lastChild = null;
    TreeNode.prototype.expanded = false;

    /**
     * Accept a visitor on this container's children
     * @param {Function} visitor
     * @param {Boolean} expandedOnly
     * @param {Boolean} reverse - walk through children in reverse order
     * @param {Boolean} any - if true, all the children will be processed,
     * and if the result of one child is true, the overall result will be true
     * @return {Boolean}
     * @version 1.0
     */
    TreeNode.prototype.acceptChildren = function (visitor, expandedOnly, reverse, any) {
        var res = !any;
        if (!expandedOnly || this.expanded) {
            var childRes;
            if (reverse) {
                for (var child = this.lastChild; child != null; child = child.previous) {
                    childRes = child.accept(visitor, expandedOnly, reverse, any);
                    if (childRes === false && !any) {
                        return false;
                    } else if (childRes === true && any) {
                        res = true;
                    }
                }
            } else {
                for (var child = this.firstChild; child != null; child = child.next) {
                    childRes = child.accept(visitor, expandedOnly, reverse, any);
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
     * @param {Boolean} expandedOnly
     * @param {Boolean} reverse - walk through children in reverse order
     * @param {Boolean} any - if true, all the children will be processed,
     * and if the result of one child is true, the overall result will be true
     * @return {Boolean} result of visiting (false = canceled, true = went through)
     */
    TreeNode.prototype.accept = function (visitor, expandedOnly, reverse, any) {
        if (visitor.call(null, this) === false) {
            return false;
        }

        return this.acceptChildren(visitor, expandedOnly, reverse, any);
    };

    TreeNode.prototype.getNestLevel = function () {
        var level = 0;
        for (var parent = this.parent; parent != null; parent = parent.parent) {
            ++level;
        }
        return level;
    };

    function VTree(container, renderer, nodeStyle) {
        VList.call(this, container, renderer, 0, 0);
        this._root = new TreeNode();
        this._root.expanded = true;

        var testRow = document.createElement('div');
        this._rowStyle = nodeStyle ? nodeStyle : VTree.DEFAULT_ROW_STYLE;
        testRow.classList.add(this._rowStyle);
        testRow.style.display = 'none';
        document.body.appendChild(testRow);
        var style = getComputedStyle(testRow);
        var padding = parseInt(style.paddingLeft);
        this._paddingLeft = padding ? padding : VTree.DEFAULT_PADDING;
        var lineHeight = parseInt(style.lineHeight);
        this._rowHeight = lineHeight ? lineHeight : VTree.DEFAULT_LINE_HEIGHT;
        document.body.removeChild(testRow);
    }

    VTree.DEFAULT_ROW_STYLE = 'vrow';
    VTree.DEFAULT_PADDING = 40;
    VTree.DEFAULT_LINE_HEIGHT = 35;

    VTree.prototype = Object.create(VList.prototype);

    VTree.prototype._root = null;
    VTree.prototype._rowStyle = null;
    VTree.prototype._paddingLeft = '0px';


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
            node.next.previoud = node.previous;
        }

        node.parent = null;
        node.previous = null;
        node.next = null;

        // TODO: remove this, and add expand eventListener instead
        --this._rowCount;
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

        // TODO: remove this, and add expand eventListener instead
        ++this._rowCount;

        return this;
    };

    /** override */
    VTree.prototype._renderViewport = function (index) {
        if (this._rowCount && this._renderer && this._rowHeight) {
            var lastIndex = Math.min(this._rowCount, index + this._cachedRows);

            var fragment = document.createDocumentFragment();

            for (var i = index; i < lastIndex; i++) {
                var node = this._getNodeByIdx(i + 1, true);
                if (node) {
                    var row = document.createElement('div');
                    row.classList.add(this._rowStyle);
                    row.style.top = (i * this._rowHeight) + 'px';
                    row.style.paddingLeft = (this._paddingLeft * (node.getNestLevel() - 1)).toString() + 'px';
                    this._renderer(node, row);
                    fragment.appendChild(row);
                }
            }

            for (var j = 1, l = this._container.childNodes.length; j < l; j++) {
                this._container.childNodes[j].style.display = 'none';
                this._container.childNodes[j].setAttribute('data-clean', '');
            }

            this._container.appendChild(fragment);
        }
    };

    VTree.prototype._calcExpandedRawCount = function () {
        // TODO: calculate when expand/collapse is clicked
        this._rowCount = res;
    };

    VTree.prototype._getNodeByIdx = function (idx, expandedOnly) {
        var i = 0;
        var nodeRef = null;
        this._root.acceptChildren(function(node){
            ++i;
            if (i == idx) {
                nodeRef = node;
                return false;
            }
            return true;
        }, expandedOnly);
        return nodeRef;
    };

    _.TreeNode = TreeNode;
    _.VTree = VTree;
})(this);