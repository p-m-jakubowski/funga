'use strict';

// little hack to handle circular dependencies
module.exports = ReactivePromise;

var SmartResolver = require('./SmartResolver');

var STATE = {
    RUNNING: 0,
    REJECTING: 1,
    REJECTED: 2,
    CANCELED: 3
};

function ReactivePromise(executor, args) {
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

    var resolve = function(value) {
        if (state !== STATE.RUNNING) {
            throw new Error('resolve when not running');
        }
        smartResolver.resolve(value);
    };

    var reject = function(_error) {
        if (state !== STATE.RUNNING) {
            throw new Error('reject when not running');
        }

        try {
            destroy();
        } catch (error) {
            return reject(error);
        }
        state = STATE.REJECTING;
        timeout = setTimeout(function() {
            state = STATE.REJECTED;
            error = _error;
            for (var i = handlers.length - 1; i>=0; --i) {
                handlers[i].onReject(error);
            }
        });
    };

    var smartResolver = new SmartResolver(
        function (_value) {
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                resolvedLeastOnce = true;
                value = _value;
                for (var i in handlers) {
                    handlers[i].onResolve(value);
                }
            });
        },
        reject
    );

    var destroy = function() {
        clearTimeout(timeout);
        if (smartResolver) {
            smartResolver.dispose();
            smartResolver = null;
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
            destructor = executor.apply(null, [resolve, reject].concat(args));
        } catch (error) {
            reject(error);
        }
    });

    this.executor = executor;
    this.args = args || [];

    this.next = function(onResolve, onReject) {
        if (typeof onResolve !== 'function') {
            throw new Error('onResolve must be a function');
        }

        if (typeof onReject !== 'function') {
            throw new Error('onReject must be a function');
        }

        var handler = createHandler(onResolve, onReject, function() {
            handlers.splice(handlers.indexOf(handler), 1);
        });

        setTimeout(function() {
            handlers.push(handler);

            if (state === STATE.RUNNING && resolvedLeastOnce) {
                handler.onResolve(value);
            } else if (state === STATE.REJECTED) {
                handler.onReject(error);
            } else if (state === STATE.CANCELED) {
                handler.cancel();
            }
        });

        return handler.reactivePromise;
    };

    this.cancel = function() {
        try {
            destroy();
            state = STATE.CANCELED;
            for (var i = handlers.length - 1; i>=0; --i) {
                handlers[i].cancel();
            }
        } catch (error) {
            reject(error);
        };
    };
}

function createHandler(onResolve, onReject, onCancel) {
    var resolve;
    var reject;
    var reactivePromise = new ReactivePromise(function (_resolve, _reject) {
        resolve = function(value) {
            try {
                _resolve(onResolve(value));
            } catch (error) {
                _reject(error);
            }
        };
        reject = function(error) {
            try {
                onReject(error);
                reactivePromise.cancel();
            } catch (error) {
                _reject(error);
            }
        };
        return onCancel;
    });

    return {
        reactivePromise: reactivePromise,
        onResolve: function(value) {
            resolve(value);
        },
        onReject: function(error) {
            reject(error);
        },
        cancel: function() {
            reactivePromise.cancel();
        }
    };
}
