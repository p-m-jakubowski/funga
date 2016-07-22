'use strict';

var Emitter = require('./Emitter');
var ConsumingEmitter = require('./ConsumingEmitter');
var ResolvingEmitter = require('./ResolvingEmitter');

module.exports = {
    emit: function(base) {
        return function() {
            return new Emitter(base, Array.prototype.slice.call(arguments));
        };
    },
    consume: function(digest) {
        return function() {
            return new ConsumingEmitter(digest, Array.prototype.slice.call(arguments));
        };
    },
    resolve: function(emitterFactory) {
        return function() {
            return new ResolvingEmitter(
                emitterFactory(Array.prototype.slice.call(arguments))
            );
        };
    }
};
