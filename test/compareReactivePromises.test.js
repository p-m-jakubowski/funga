'use strict';

var ReactivePromise = require('../src/ReactivePromise');
var compareReactivePromises = require('../src/compareReactivePromises');

describe('compareReactivePromises', function() {

    it('should return false for reactivePromises with different executor', function() {
        var reactivePromiseA = new ReactivePromise(function() {});
        var reactivePromiseB = new ReactivePromise(function() {});

        expect(compareReactivePromises(reactivePromiseA, reactivePromiseB)).toBe(false);
    });

    it('should return false for reactivePromises with different arguments length', function() {
        var executor = function() {};
        var reactivePromiseA = new ReactivePromise(executor, [1, 2]);
        var reactivePromiseB = new ReactivePromise(executor, [1, 2, 3]);

        expect(compareReactivePromises(reactivePromiseA, reactivePromiseB)).toBe(false);
    });

    it('should return false for reactivePromises with different non-resolvable arguments', function() {
        var executor = function() {};
        var reactivePromiseA = new ReactivePromise(executor, [{a: 1}]);
        var reactivePromiseB = new ReactivePromise(executor, [{a: 2}]);
        var reactivePromiseC = new ReactivePromise(executor, [{a: 1, b: 2}]);
        var reactivePromiseD = new ReactivePromise(executor, [null]);
        var reactivePromiseE = new ReactivePromise(executor, [1]);

        expect(compareReactivePromises(reactivePromiseA, reactivePromiseB)).toBe(false);
        expect(compareReactivePromises(reactivePromiseA, reactivePromiseC)).toBe(false);
        expect(compareReactivePromises(reactivePromiseA, reactivePromiseD)).toBe(false);
        expect(compareReactivePromises(reactivePromiseA, reactivePromiseE)).toBe(false);
    });

    it('should return false for reactivePromises with different resolvable arguments', function() {
        var executor = function() {};
        var reactivePromiseA = new ReactivePromise(executor, [new ReactivePromise(function() {})]);
        var reactivePromiseB = new ReactivePromise(executor, [new ReactivePromise(function() {})]);

        expect(compareReactivePromises(reactivePromiseA, reactivePromiseB)).toBe(false);
    });

    it('should return true in other case', function() {
        var executor = function() {};
        var reactivePromiseA = new ReactivePromise(executor, [1, {a: 1, b: 2}, new ReactivePromise(executor)]);
        var reactivePromiseB = new ReactivePromise(executor, [1, {a: 1, b: 2}, new ReactivePromise(executor)]);

        expect(compareReactivePromises(reactivePromiseA, reactivePromiseB)).toBe(true);
    });

});
