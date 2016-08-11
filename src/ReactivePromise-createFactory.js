'use strict';

var ReactivePromise = require('./ReactivePromise');

function createFactory(executor) {
    return function() {
        return new ReactivePromise(executor, Array.prototype.slice.call(arguments));
    };
}

module.exports = createFactory;
