'use strict';

var ReactivePromise = require('../src/ReactivePromise');
var createFactory = require('../src/ReactivePromise-createFactory');

describe('createFactory', function() {

    it('should return factory', function() {
        var executor = function() {};
        var args = [{a:1}, {b:2}];
        var createReactivePromise = createFactory(executor);
        var reactivePromise = createReactivePromise(args[0], args[1]);

        expect(reactivePromise instanceof ReactivePromise).toBe(true);
        expect(reactivePromise.executor).toBe(executor);
        expect(reactivePromise.args[0]).toBe(args[0]);
        expect(reactivePromise.args[1]).toBe(args[1]);
    });

});
