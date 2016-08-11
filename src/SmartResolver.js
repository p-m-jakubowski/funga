'use strict';

var ReactivePromise = require('./ReactivePromise');
var compareReactivePromises = require('./compareReactivePromises');

function SmartResolver(onResolve, onReject) {
    var resolver;

    this.resolve = function(value) {
        if (value instanceof ReactivePromise) {
            if (!(resolver instanceof ReactivePromiseResolver)) {
                this.dispose();
                resolver = new ReactivePromiseResolver(onResolve, onReject);
            }        
            resolver.resolve(value);
        } else if (isResolvableObject(value)) {
            if (!(resolver instanceof ObjectResolver)) {
                this.dispose();
                resolver = new ObjectResolver(onResolve, onReject);
            }        
            resolver.resolve(value);
        } else {
            this.dispose();
            onResolve(value);
        }
    };

    this.dispose = function() {
        if (resolver) {
            resolver.dispose();
            resolver = null;
        }
    };
}

function ReactivePromiseResolver(onResolve, onReject) {
    var lastReactivePromise;
    var resolvedLeastOnce;
    var lastValue;

    this.resolve = function(reactivePromise) {
        if (lastReactivePromise && compareReactivePromises(reactivePromise, lastReactivePromise)) {
            if (reactivePromise !== lastReactivePromise) {
                reactivePromise.cancel();
            }
            if (resolvedLeastOnce) {
                onResolve(lastValue);
            }
            return;
        }

        this.dispose();
        reactivePromise.next(
            function(value) {
                resolvedLeastOnce = true;
                lastValue = value;
                onResolve(value);
            },
            function(error) {
                lastReactivePromise = null;
                onReject(error);
            }
        );
        lastReactivePromise = reactivePromise;
    };

    this.dispose = function() {
        if (lastReactivePromise) {
            lastReactivePromise.cancel();
            lastReactivePromise = null;
        }
    };
}

function ObjectResolver(onResolve, onReject) {
    var self = this;
    var reactivePromiseResolvers;
    var value;

    function maybeCallOnResolve() {
        if (!isResolvableObject(value)) {
            onResolve(clone(value));
        }
    }

    this.resolve = function(object) {
        var newReactivePromiseResolvers = {}; 

        value = clone(object);

        for (var i in value) {
            if (!(value[i] instanceof ReactivePromise)) {
                continue;
            }

            if (reactivePromiseResolvers && (i in reactivePromiseResolvers)) {
                newReactivePromiseResolvers[i] = reactivePromiseResolvers[i];
                reactivePromiseResolvers[i] = null;
            } else {
                (function(i) {
                    newReactivePromiseResolvers[i] = new ReactivePromiseResolver(
                        function (partialValue) {
                            value[i] = partialValue;
                            maybeCallOnResolve();
                        },
                        function (error) {
                            self.dispose();
                            onReject(error);
                        }
                    );
                })(i);
            }

            newReactivePromiseResolvers[i].resolve(value[i]);
        }

        this.dispose();
        reactivePromiseResolvers = newReactivePromiseResolvers;
    };

    this.dispose = function() {
        if (!reactivePromiseResolvers) {
            return;
        }

        for (var i in reactivePromiseResolvers) {
            if (reactivePromiseResolvers[i]) {
                reactivePromiseResolvers[i].dispose();          
            }
        }
        reactivePromiseResolvers = null;
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
            if (value[i] instanceof ReactivePromise) {
                return true;
            }
        }
    }
    return false;
}

module.exports = SmartResolver;
