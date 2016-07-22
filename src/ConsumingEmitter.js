'use strict';

var Emitter = require('./Emitter');
var Resolver = require('./Resolver');

function ConsumingEmitter(digest, args) {
    Emitter.call(this, consumingEmitterBase, [digest].concat(args));
}

function consumingEmitterBase(emit, fail, digest) {
    var args = Array.prototype.slice.call(arguments, 3);
    var resolver = new Resolver();

    resolver.onResolve = function(resolvedArgs) {
        try {
            emit(digest.apply(null, resolvedArgs)); 
        } catch (error) {
            fail(error); 
        }
    };
    resolver.onError = fail;

    resolver.resolve(args);

    return function() {
        resolver.dispose();
    };
}

ConsumingEmitter.prototype = Object.create(Emitter.prototype);

module.exports = ConsumingEmitter;
