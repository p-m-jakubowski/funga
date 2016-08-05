'use strict';

var Emitter = require('./Emitter');

function compareEmitters(emitterA, emitterB) {
    if (emitterA.executor !== emitterB.executor) {
        return false;
    }

    if (emitterA.args.length !== emitterB.args.length) {
        return false;
    }

    for (var i in emitterA.args) {
        if (emitterA.args[i] === emitterB.args[i]) {
            continue;
        }

        if (emitterA.args[i] instanceof Emitter && emitterB.args[i] instanceof Emitter) {
            if (!compareEmitters(emitterA.args[i], emitterB.args[i])) {
                return false;
            }
        } else if (typeof emitterA.args[i] === 'object' && typeof emitterB.args[i] === 'object') {
            if (!compareObjects(emitterA.args[i], emitterB.args[i])) {
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

module.exports = compareEmitters;
