(function (_) {
    // Some code taken from https://github.com/sergi/virtual-list
    function VList(container, renderer, rowCount, rowHeight) {
        rowCount = rowCount || 0;
        rowHeight = rowHeight || 30;

        // Create our scroller, first
        this._scroller = document.createElement('div');
        this._scroller.classList.add('vscroller');

        // Update our container styles & add scroller
        this._container = container;
        this._container.style.overflow = 'auto';
        this._container.style.position = 'relative';
        this._container.appendChild(this._scroller);
        this._container.addEventListener('scroll', this._onScroll.bind(this));

        this.beginUpdate();

        if (renderer) {
            this.renderer(renderer);
        }

        if (rowHeight) {
            this.rowHeight(rowHeight);
        }

        if (rowCount) {
            this.rowCount(rowCount);
        }

        this.endUpdate();
    }

    VList.prototype._renderer = null;
    VList.prototype._rowHeight = 0;
    VList.prototype._rowCount = 0;
    VList.prototype._visibleRows = 0;
    VList.prototype._cachedRows = 0;
    VList.prototype._scroller = null;
    VList.prototype._updateCounter = 0;
    VList.prototype._lastRenderScrollTop = 0;
    VList.prototype._lastScrolledTime = 0;
    VList.prototype._scrollTimerId = null;

    VList.prototype.renderer = function (renderer) {
        if (!arguments.length) {
            return this._renderer;
        } else {
            this._renderer = renderer;
            this.render();
            return this;
        }
    };

    VList.prototype.rowHeight = function (rowHeight) {
        if (!arguments.length) {
            return this._rowHeight;
        } else {
            this._rowHeight = rowHeight;
            this._updateVisibleRows();
            this._updateScroller();
            this.render();
            return this;
        }
    };

    VList.prototype.rowCount = function (rowCount) {
        if (!arguments.length) {
            return this._rowCount;
        } else {
            this._rowCount = rowCount;
            this._updateScroller();
            this.render();
            return this;
        }
    };

    VList.prototype.beginUpdate = function () {
        this._updateCounter++;
    };

    VList.prototype.endUpdate = function () {
        if (--this._updateCounter === 0) {
            this.render();
        }
    };

    VList.prototype.refresh = function () {
        this._updateVisibleRows();
        this._updateScroller();
        this.render();
        return this;
    };

    VList.prototype.render = function () {
        if (this._updateCounter === 0) {
            var scrollTop = this._container.scrollTop;
            var first = parseInt(scrollTop / this._rowHeight) - this._visibleRows;
            this._renderViewport(first < 0 ? 0 : first);
        }
        return this;
    };

    VList.prototype._updateVisibleRows = function () {
        this._visibleRows = Math.ceil(this._container.offsetHeight / this._rowHeight);
        this._cachedRows = this._visibleRows * 3;
        this._scrollCacheSize = this._visibleRows * this._rowHeight;
    };

    VList.prototype._updateScroller = function () {
        this._scroller.style.height = (this._rowCount * this._rowHeight).toString() + 'px';
    };

    VList.prototype._onScroll = function (e) {
        e.preventDefault();

        if (this._scrollTimerId === null) {
            this._scrollTimerId = setTimeout(function () {
                if (Date.now() - this._lastScrolledTime > 100) {
                    this._cleanViewport();
                }
                this._scrollTimerId = null;
            }.bind(this), 300);
        }

        var scrollTop = this._container.scrollTop;
        if (!this._lastRenderScrollTop || Math.abs(scrollTop - this._lastRenderScrollTop) > this._scrollCacheSize) {
            this.render();
            this._lastRenderScrollTop = scrollTop;
        }

        this._lastScrolledTime = Date.now();
    };

    VList.prototype._renderViewport = function (index) {
        if (this._rowCount && this._renderer && this._rowHeight) {
            var lastIndex = Math.min(this._rowCount, index + this._cachedRows);

            var fragment = document.createDocumentFragment();

            for (var i = index; i < lastIndex; i++) {
                var row = document.createElement('div');
                row.classList.add('vrow');
                row.style.top = (i * this._rowHeight) + 'px';
                this._renderer(i, row);
                fragment.appendChild(row);
            }

            for (var j = 1, l = this._container.childNodes.length; j < l; j++) {
                this._container.childNodes[j].style.display = 'none';
                this._container.childNodes[j].setAttribute('data-clean', '');
            }

            this._container.appendChild(fragment);
        }
    };

    VList.prototype._cleanViewport = function () {
        var nodesToClean = this._container.querySelectorAll('.vrow[data-clean]');
        for (var i = 0, l = nodesToClean.length; i < l; i++) {
            this._container.removeChild(nodesToClean[i]);
        }
    };

    _.VList = VList;
})(this);