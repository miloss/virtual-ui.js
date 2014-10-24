function VTree(container, renderer, nodeHeight) {
    VList.call(this, container, this._renderer, 200, nodeHeight);
}

VTree.prototype = Object.create(VList.prototype);

VTree.prototype._renderer = function (index, row) {
    row.innerHTML = 'NODE ##' + index;
};