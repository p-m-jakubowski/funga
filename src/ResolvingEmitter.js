'use strict';

var Emitter = require('./Emitter');
var Resolver = require('./Resolver');

function ResolvingEmitter(emitter) {
    Emitter.call(this, resolvingEmitterBase, [emitter]);
}

function resolvingEmitterBase(emit, fail, emitter) {
    var resolver = new Resolver();

    emitter.next(
        function(value) {
            if (!isResolvableObject(value)) {
                resolver.onResolve = function(resolvedValues) {
                    emit(resolvedValues[0]);
                };
                resolver.resolve([value]);
            } else {
                resolver.onResolve = emit;
                resolver.resolve(value);
            }
        },
        fail
    );

    resolver.onError = fail;

    return function() {
        emitter.destroy();
        resolver.dispose();
    };        
}

function isResolvableObject(value) {
    if (typeof value === 'object' && value !== null) {
        for (var i in value) {
            if (value[i] instanceof Emitter) {
                return true;
            };
        }
    }
    return false;
}

ResolvingEmitter.prototype = Object.create(Emitter.prototype);

module.exports = ResolvingEmitter;
