'use strict';

var ReactivePromise = require('./ReactivePromise');

function compareReactivePromises(reactivePromiseA, reactivePromiseB) {
    if (reactivePromiseA.executor !== reactivePromiseB.executor) {
        return false;
    }

    if (reactivePromiseA.args.length !== reactivePromiseB.args.length) {
        return false;
    }

    for (var i in reactivePromiseA.args) {
        if (reactivePromiseA.args[i] === reactivePromiseB.args[i]) {
            continue;
        }

        if (reactivePromiseA.args[i] instanceof ReactivePromise && reactivePromiseB.args[i] instanceof ReactivePromise) {
            if (!compareReactivePromises(reactivePromiseA.args[i], reactivePromiseB.args[i])) {
                return false;
            }
        } else if (typeof reactivePromiseA.args[i] === 'object' && typeof reactivePromiseB.args[i] === 'object') {
            if (!compareObjects(reactivePromiseA.args[i], reactivePromiseB.args[i])) {
                return false;
            }
        } else {
            return false;
        }
    }

    return true;
}

function compareObjects(objectA, objectB) {
    if (objectA === null || objectB === null) {
        return false;
    }

    if (Object.keys(objectA).length !== Object.keys(objectB).length) {
        return false;
    }

    for (var i in objectA) {
        if (objectA[i] !== objectB[i]) {
            return false;
        }
    }

    return true;
}

module.exports = compareReactivePromises;
