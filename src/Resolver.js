'use strict';

var Emitter = require('./Emitter');
var compareEmitters = require('./compareEmitters');

function Resolver() {
    var self = this;
    var emitters = {};
    var value;

    this.resolve = function(newValue) {
        var newEmitters = {};

        newValue = clone(newValue);

        for (var i in newValue) {
            if (!(newValue[i] instanceof Emitter)) {
                newValue[i] = new Emitter(passThrough, [newValue[i]]);
            }
            
            newEmitters[i] = newValue[i];

            if (emitters[i] && compareEmitters(emitters[i], newEmitters[i])) {
                newEmitters[i] = emitters[i];
                newValue[i] = value[i];
                emitters[i] = null;
                continue;
            }

            (function(i) {
                function onPartialValue(partialValue) {
                    value[i] = partialValue;
                    for (var j in value) {
                        if (value[j] instanceof Emitter) {
                            return;
                        }
                    }
                    self.onResolve(clone(value));
                }

                function onError(error) {
                    self.onError(error);
                }

                newEmitters[i].next(onPartialValue, onError);
            })(i);
        }

        this.dispose();

        emitters = newEmitters;
        value = newValue;
    };

    this.dispose = function() {
        for (var i in emitters) {
            if (emitters[i]) {
                emitters[i].destroy();          
                emitters[i] = null;
            }
        }
    };
}

function passThrough(push, fail, arg) {
    push(arg);
}

function clone(value) {
    var clonedValue;

    if (value instanceof Array) {
        clonedValue = value.concat([]);
    } else {
        clonedValue = {};
        for (var i in value) {
            clonedValue[i] = value[i];
        }
    }

    return clonedValue;
}

module.exports = Resolver;
