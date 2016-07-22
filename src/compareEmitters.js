'use strict';

var Emitter = require('./Emitter');

function compareEmitters(emitterA, emitterB) {
    if (emitterA.base !== emitterB.base) {
        return false;
    }

    if (emitterA.args.length !== emitterB.args.length) {
        return false;
    }

    for (var i in emitterA.args) {
        if (emitterA.args[i] instanceof Emitter && emitterB.args[i] instanceof Emitter) {
            if (!compareEmitters(emitterA.args[i], emitterB.args[i])) {
                return false;
            }
        } else if (emitterA.args[i] !== emitterB.args[i]) {
            return false;
        }
    }

    return true;
}

module.exports = compareEmitters;
