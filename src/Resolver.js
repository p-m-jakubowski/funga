'use strict';

// little hack to handle circular dependencies
module.exports = Resolver;

var Emitter = require('./Emitter');
var compareEmitters = require('./compareEmitters');

function Resolver(onResolve, onError) {
    var specializedResolver;

    this.resolve = function(value) {
        if (value instanceof Emitter) {
            if (!(specializedResolver instanceof EmitterResolver)) {
                this.dispose();
                specializedResolver = new EmitterResolver(onResolve, onError);
            }        
            specializedResolver.resolve(value);
        } else if (isResolvableObject(value)) {
            if (!(specializedResolver instanceof ObjectResolver)) {
                this.dispose();
                specializedResolver = new ObjectResolver(onResolve, onError);
            }        
            specializedResolver.resolve(value);
        } else {
            this.dispose();
            onResolve(value);
        }
    };

    this.dispose = function() {
        if (specializedResolver) {
            specializedResolver.dispose();
            specializedResolver = null;
        }
    };
}

function EmitterResolver(onResolve, onError) {
    var lastEmitter;
    var resolvedLeastOnce;
    var lastValue;

    this.resolve = function(emitter) {
        if (lastEmitter && compareEmitters(emitter, lastEmitter)) {
            if (resolvedLeastOnce) {
                onResolve(lastValue);
            }
            return;
        }

        this.dispose();
        emitter.next(
            function(value) {
                resolvedLeastOnce = true;
                lastValue = value;
                onResolve(value);
            },
            function(error) {
                lastEmitter = null;
                onError(error);
            }
        );
        lastEmitter = emitter;
    };

    this.dispose = function() {
        if (lastEmitter) {
            lastEmitter.cancel();
            lastEmitter = null;
        }
    };
}

function ObjectResolver(onResolve, onError) {
    var self = this;
    var emitterResolvers;
    var value;

    function maybeCallOnResolve() {
        if (!isResolvableObject(value)) {
            onResolve(clone(value));
        }
    }

    this.resolve = function(object) {
        var newEmitterResolvers = {}; 

        object = clone(object);

        for (var i in object) {
            if (!(object[i] instanceof Emitter)) {
                continue;
            }

            if (emitterResolvers && (i in emitterResolvers)) {
                newEmitterResolvers[i] = emitterResolvers[i];
                object[i] = value[i];
                emitterResolvers[i] = null;
                continue;
            }

            (function(i) {
                newEmitterResolvers[i] = new EmitterResolver(
                    function (partialValue) {
                        value[i] = partialValue;
                        maybeCallOnResolve();
                    },
                    function (error) {
                        self.dispose();
                        onError(error);
                    }
                );
                newEmitterResolvers[i].resolve(object[i]);
            })(i);
        }

        this.dispose();

        emitterResolvers = newEmitterResolvers;
        value = object;

        maybeCallOnResolve();
    };

    this.dispose = function() {
        if (!emitterResolvers) {
            return;
        }

        for (var i in emitterResolvers) {
            if (emitterResolvers[i]) {
                emitterResolvers[i].dispose();          
            }
        }
        emitterResolvers = null;
    };
}

function clone(object) {
    var clonedObject;

    if (object instanceof Array) {
        clonedObject = object.concat([]);
    } else {
        clonedObject = {};
        for (var i in object) {
            clonedObject[i] = object[i];
        }
    }

    return clonedObject;
}

function isResolvableObject(value) {
    if (typeof value === 'object' && value !== null) {
        for (var i in value) {
            if (value[i] instanceof Emitter) {
                return true;
            }
        }
    }
    return false;
}
