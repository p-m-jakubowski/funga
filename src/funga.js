'use strict';

var Emitter = require('./Emitter');

function factory(executor) {
    return function() {
        return new Emitter(executor, Array.prototype.slice.call(arguments));
    };
}

module.exports = Emitter;
module.exports.factory = factory;
