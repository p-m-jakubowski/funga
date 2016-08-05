'use strict';

// little hack to handle circular dependencies
module.exports = Emitter;

var Resolver = require('./Resolver');

var STATE = {
    RESOLVED: 0,
    FAILED: 1
};

function Emitter(executor, args) {
    var self = this;
    var handlers;
    var isRunning;
    var destructor;
    var state;
    var timeout;
    var value;
    var error;
    var outputResolver;

    function start() {
        function emit(value) {
            if (!isRunning) {
                throw new Error('emit when not running');
            }
            outputResolver.resolve(value);
        }

        function fail(_error) {
            if (!isRunning) {
                throw new Error('fail when not running');
            }

            state = STATE.FAILED;
            error = _error;
            destroy();

            timeout = setTimeout(function() {
                for (var i in handlers) {
                    handlers[i].onError(error);
                }
                handlers = null;
            });
        }

        try {
            isRunning = true;
            outputResolver = new Resolver(
                function (_value) {
                    clearTimeout(timeout);
                    state = STATE.RESOLVED;
                    value = _value;
                    timeout = setTimeout(function(_value) {
                        for (var i in handlers) {
                            handlers[i].onValue(value);
                        }
                    });
                }, 
                fail
            );
            destructor = executor.apply(null, [emit, fail].concat(args));
        } catch (error) {
            fail(error);
        }
    }

    function destroy() {
        clearTimeout(timeout);
        isRunning = false;
        if (typeof destructor === 'function') {
            destructor();
            destructor = null;
        }
        if (outputResolver) {
            outputResolver.dispose();
        }
    }

    if (typeof executor !== 'function') {
        throw new Error('Base should be a function');
    }

    this.executor = executor;
    this.args = args || [];

    this.next = function(onValue, onError) {
        var handler;

        if (typeof onValue !== 'function') {
            throw new Error('onValue must be a function');
        }

        if (typeof onError !== 'function') {
            throw new Error('onError must be a function');
        }

        handler = createHandler(onValue, onError);

        if (isRunning === undefined) {
            start();
        } else if (state === STATE.RESOLVED) {
            handler.onValue(value);
        } else if (state === STATE.FAILED) {
            handler.onError(error);
        }

        handlers = handlers || [];
        handlers.push(handler);
    };

    this.cancel = function() {
        destroy();
        if (handlers) {
            for (var i in handlers) {
                handlers[i].cancel();
            }
            handlers = null;
        }
    };
}

function createHandler(onValue, onError) {
    var timeout;

    return {
        onValue: function(value) {
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                onValue(value);
            });
        },
        onError: function(error) {
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                onError(error);
            });
        },
        cancel: function() {
            clearTimeout(timeout);
        }
    };
}

module.exports = Emitter;
