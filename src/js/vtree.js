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

    function VTree(container, renderer, nodeStyle) {
        container.style.overflow = 'scroll';
        this._containerWidth = parseInt(container.clientWidth);

        VList.call(this, container, renderer, 0, 0);
        this._root = new TreeNode();
        this._root.expanded = true;
        this._root.parent = this;

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
    }

    VTree.DEFAULT_ROW_STYLE = 'vrow';
    VTree.DEFAULT_PADDING = 40;
    VTree.DEFAULT_LINE_HEIGHT = 35;

    VTree.prototype = Object.create(VList.prototype);

    VTree.prototype._root = null;
    VTree.prototype._rowStyle = null;
    VTree.prototype._paddingLeft = '0px';
    VTree.prototype._containerWidth = 0;
    VTree.prototype._expandedWidth = 0;

    VTree.prototype.handleChange = function (change, node) {
        if (change == TreeNode._Change.ExpandedSet || change == TreeNode._Change.ExpandedRemoved) {
            this._updateRowCount();
            this._updateScroller();
            this.render();
        }
    };

    VTree.prototype.render = function () {
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
            node.next.previoud = node.previous;
        }

        node.parent = null;
        node.previous = null;
        node.next = null;

        if (node.expanded && node.firstChild) {
            this._updateRowCount();
        } else if (parent.expanded) {
            --this._rowCount;
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

        if (child.expanded && child.firstChild) {
            this._updateRowCount();
        } else if (parent.expanded) {
            ++this._rowCount;
        }

        return this;
    };

    /** override */
    VTree.prototype._renderViewport = function (index) {
        if (this._rowCount && this._renderer && this._rowHeight) {
            var lastIndex = Math.min(this._rowCount, index + this._cachedRows);
            var fragment = document.createDocumentFragment();

            // TODO: change it with traversing through tree from node with idx1 to node with idx2 without getting
            // node by idx each time
            for (var i = index; i < lastIndex; i++) {
                var node = this._getNodeByIdx(i + 1, true);
                if (node) {
                    var row = document.createElement('div');
                    row.classList.add(this._rowStyle);
                    row.style.top = (i * this._rowHeight) + 'px';
                    var padding = this._paddingLeft * (node.getNestLevel() - 1);
                    row.style.paddingLeft = padding.toString() + 'px';
                    // TODO: calculate and use this._expandedWidth
                    var width = this._containerWidth > padding ? this._containerWidth - padding : this._expandedWidth;
                    row.style.width = width.toString() + 'px';
                    if (node.expanded) {
                        var arrow = document.createElement('span');
                        arrow.innerHTML = '&#9660;';
                        row.appendChild(arrow);
                        row.addEventListener('click', function (e) {
                            if (e.target.nodeName === "SPAN") {
                                if (this.expanded) {
                                    this.expanded = false;
                                    this.handleChange(TreeNode._Change.ExpandedSet, this);
                                }
                            }
                        }.bind(node));
                    } else if (node.firstChild) {
                        var arrow = document.createElement('span');
                        arrow.innerHTML = '&#9658;';
                        row.appendChild(arrow);
                        row.addEventListener('click', function (e) {
                            if (e.target.nodeName === "SPAN") {
                                if (!this.expanded) {
                                    this.expanded = true;
                                    this.handleChange(TreeNode._Change.ExpandedRemoved, this);
                                }
                            }
                        }.bind(node));
                    }
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

    VTree.prototype._updateRowCount = function () {
        var i = 0;
        this._root.acceptChildren(function(node){
            ++i;
            return true;
        }, true);
        this._rowCount = i;
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