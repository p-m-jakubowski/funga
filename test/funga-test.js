'use strict';

var compareEmitters = require('../src/compareEmitters');
var Emitter = require('../src/Emitter');
var funga = require('../src/funga');

describe('funga', function() {

    describe('#factory', function() {

        it('should return emitter factory', function() {
            var executor = function() {};
            var args = [{a:1}, {b:2}];
            var emitterFactory = funga.factory(executor);
            var emitter = emitterFactory(args[0], args[1]);

            expect(emitter instanceof Emitter).toBe(true);
            expect(emitter.executor).toBe(executor);
            expect(emitter.args[0]).toBe(args[0]);
            expect(emitter.args[1]).toBe(args[1]);
        });

    });

});
