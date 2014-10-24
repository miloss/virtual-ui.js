(function (_) {
    function TreeNode() {
    }

    TreeNode.prototype.parent = null;
    TreeNode.prototype.previous = null;
    TreeNode.prototype.next = null;
    TreeNode.prototype.firstChild = null;
    TreeNode.prototype.lastChild = null;
    TreeNode.prototype.expanded = false;

    function VTree(container, renderer, nodeHeight) {
        VList.call(this, container, this._renderer, 200, nodeHeight);
        this._root = new TreeNode();
    }

    VTree.prototype = Object.create(VList.prototype);

    VTree.prototype._root = null;

    VTree.prototype.appendNode = function (parent, node) {
        return this._insertNodeBefore(parent || this._root, null, node);
    };

    VTree.prototype.insertNodeBefore = function (reference, node) {
        return this._insertNodeBefore(reference.parent, reference, node);
        return this;
    };

    VTree.prototype.insertNodeAfter = function (reference, node) {
        return this._insertNodeBefore(reference.parent, reference.next ? reference.next : null, node);
        return this;
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

        return this;
    };

    VTree.prototype._renderer = function (index, row) {
        row.innerHTML = 'NODE ##' + index;
    };

    _.VTree = VTree;
})(this);