'use strict';

// little hack to handle circular dependencies
module.exports = Emitter;

var Resolver = require('./Resolver');

var STATE = {
    RUNNING: 0,
    DESTROYED: 1
};

function Emitter(executor, args) {
    var self = this;
    var destructor;
    var state;
    var timeout;
    var outputResolver;

    if (typeof executor !== 'function') {
        throw new Error('Base should be a function');
    }

    this.executor = executor;
    this.args = args || [];

    this.next = function(onValue, onError) {
        if (state !== undefined) {
            return;
        }

        if (typeof onValue !== 'function') {
            throw new Error('onValue must be a function');
        }

        if (typeof onError !== 'function') {
            throw new Error('onError must be a function');
        }
        
        function emit(value) {
            if (state !== STATE.RUNNING) {
                throw new Error('emit when not running');
            }

            outputResolver.resolve(value);
        }

        function fail(error) {
            if (state !== STATE.RUNNING) {
                throw new Error('fail when not running');
            }

            self.destroy();
            timeout = setTimeout(function() {
                onError(error);
            });
        }

        try {
            state = STATE.RUNNING;
            outputResolver = new Resolver(
                function (value) {
                    clearTimeout(timeout);
                    timeout = setTimeout(function() {
                        onValue(value);
                    });
                }, 
                fail
            );
            destructor = executor.apply(null, [emit, fail].concat(args));
        } catch (error) {
            fail(error);
        }
    };

    this.destroy = function() {
        state = STATE.DESTROYED;
        clearTimeout(timeout);
        if (outputResolver) {
            outputResolver.dispose();
            outputResolver = null;
        }
        if (typeof destructor === 'function') {
            destructor();
            destructor = null;
        }
    };
}
