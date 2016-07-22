'use strict';

var STATE = {
    RUNNING: 0,
    DESTROYED: 1
};

function Emitter(base, args) {
    var self = this;
    var destructor;
    var state;
    var timeout;

    if (typeof base !== 'function') {
        throw new Error('Base should be a function');
    }

    this.base = base;
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

            clearTimeout(timeout);
            timeout = setTimeout(function() {
                onValue(value);
            });
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
            destructor = base.apply(null, [emit, fail].concat(args));
        } catch (error) {
            fail(error);
        }
    };

    this.destroy = function() {
        state = STATE.DESTROYED;
        clearTimeout(timeout);
        if (typeof destructor === 'function') {
            destructor();
            destructor = null;
        }
    };
}

module.exports = Emitter;
