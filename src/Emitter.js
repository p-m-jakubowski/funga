'use strict';

// little hack to handle circular dependencies
module.exports = Emitter;

var Resolver = require('./Resolver');

var STATE = {
    RUNNING: 0,
    FAILING: 1,
    FAILED: 2,
    CANCELED: 3
};

function Emitter(executor, args) {
    if (typeof executor !== 'function') {
        throw new Error('Base should be a function');
    }

    var state;
    var destructor;
    var timeout;
    var value;
    var error;

    var resolvedLeastOnce = false;
    var handlers = [];

    var emit = function(value) {
        if (state !== STATE.RUNNING) {
            throw new Error('emit when not running');
        }
        outputResolver.resolve(value);
    };

    var fail = function(_error) {
        if (state !== STATE.RUNNING) {
            throw new Error('fail when not running');
        }

        try {
            destroy();
        } catch (error) {
            return fail(error);
        }
        state = STATE.FAILING;
        timeout = setTimeout(function() {
            state = STATE.FAILED;
            error = _error;
            for (var i = handlers.length - 1; i>=0; --i) {
                handlers[i].onError(error);
            }
        });
    };

    var outputResolver = new Resolver(
        function (_value) {
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                resolvedLeastOnce = true;
                value = _value;
                for (var i in handlers) {
                    handlers[i].onValue(value);
                }
            });
        },
        fail
    );

    var destroy = function() {
        clearTimeout(timeout);
        if (outputResolver) {
            outputResolver.dispose();
            outputResolver = null;
        }
        if (typeof destructor === 'function') {
            try {
                destructor();
            } finally {
                destructor = null;
            }
        }
    };

    timeout = setTimeout(function() {
        try {
            state = STATE.RUNNING;
            destructor = executor.apply(null, [emit, fail].concat(args));
        } catch (error) {
            fail(error);
        }
    });

    this.executor = executor;
    this.args = args || [];

    this.next = function(onValue, onError) {
        if (typeof onValue !== 'function') {
            throw new Error('onValue must be a function');
        }

        if (typeof onError !== 'function') {
            throw new Error('onError must be a function');
        }

        var handler = createHandler(onValue, onError, function() {
            handlers.splice(handlers.indexOf(handler), 1);
        });

        setTimeout(function() {
            handlers.push(handler);

            if (state === STATE.RUNNING && resolvedLeastOnce) {
                handler.onValue(value);
            } else if (state === STATE.FAILED) {
                handler.onError(error);
            } else if (state === STATE.CANCELED) {
                handler.cancel();
            }
        });

        return handler.emitter;
    };

    this.cancel = function() {
        try {
            destroy();
            state = STATE.CANCELED;
            for (var i = handlers.length - 1; i>=0; --i) {
                handlers[i].cancel();
            }
        } catch (error) {
            fail(error);
        };
    };
}

function createHandler(onValue, onError, onDestroy) {
    var emit;
    var fail;
    var emitter = new Emitter(function (_emit, _fail) {
        emit = function(value) {
            try {
                _emit(onValue(value));
            } catch (error) {
                _fail(error);
            }
        };
        fail = function(error) {
            try {
                onError(error);
                emitter.cancel();
            } catch (error) {
                _fail(error);
            }
        };
        return onDestroy;
    });

    return {
        emitter: emitter,
        onValue: function(value) {
            emit(value);
        },
        onError: function(error) {
            fail(error);
        },
        cancel: function() {
            emitter.cancel();
        }
    };
}
