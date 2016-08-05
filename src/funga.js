'use strict';

var Emitter = require('./Emitter');

function factory(base) {
    return function() {
        return new Emitter(base, Array.prototype.slice.call(arguments));
    };
}

module.exports = {
    factory: factory
};
