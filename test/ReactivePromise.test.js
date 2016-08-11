'use strict';

var _ = require('lodash');

var ReactivePromise = require('../src/ReactivePromise');

var noop = function() {};

describe('ReactivePromise', function() {
    var reactivePromise;
    var resolve;
    var reject;

    beforeEach(function() {
        reactivePromise = new ReactivePromise(function (_resolve, _reject) {
            resolve = _resolve;
            reject = _reject;
        });
        jest.runAllTimers();
    });

    it('should throw an error when executor is not a function', function() {
        expect(function() {
            new ReactivePromise(null);
        }).toThrow();
    });

    it('should expose executor and arguments', function() {
        var executor = function() {};
        var args = [{}, {}];
        var reactivePromise = new ReactivePromise(executor, args);

        expect(reactivePromise.executor).toBe(executor);
        expect(reactivePromise.args.length).toBe(2);
        expect(reactivePromise.args[0]).toBe(args[0]);
        expect(reactivePromise.args[1]).toBe(args[1]);
    });

    it('should call executor asynchronously', function() {
        var executor = jest.fn();
        var reactivePromise = new ReactivePromise(executor);

        expect(executor).not.toBeCalled();

        jest.runAllTimers();
        expect(executor).toBeCalled();
    });

    it('should pass arguments to executor', function() {
        var executor = jest.fn();
        var args = [{}, {}];
        var reactivePromise = new ReactivePromise(executor, args);

        jest.runAllTimers();
        expect(executor.mock.calls[0][2]).toBe(args[0]);
        expect(executor.mock.calls[0][3]).toBe(args[1]);
    });

    it('should not call pending executor after being canceled', function() {
        var executor = jest.fn();
        var reactivePromise = new ReactivePromise(executor);

        expect(executor).not.toBeCalled();

        reactivePromise.cancel();
        jest.runAllTimers();
        expect(executor).not.toBeCalled();
    });

    it('should throw an error on #next call when value handler is not a function', function() {
        expect(function() {
            reactivePromise.next(null, noop);
        }).toThrow();
    });

    it('should throw an error on #next call when error handler is not a function', function() {
        expect(function() {
            reactivePromise.next(noop, null);
        }).toThrow();
    });

    it('should call value handlers asynchronously with value passed to `resolve`', function() {
        var onResolveA = jest.fn();
        var onResolveB = jest.fn();
        var value = {a: 1, b: 2};

        reactivePromise.next(onResolveA, noop);
        reactivePromise.next(onResolveB, noop);
        resolve(value);
        expect(onResolveA).not.toBeCalled();
        expect(onResolveB).not.toBeCalled();

        jest.runAllTimers();
        expect(onResolveA).toBeCalled();
        expect(onResolveB).toBeCalled();
        expect(onResolveA.mock.calls[0][0]).toBe(value);
        expect(onResolveB.mock.calls[0][0]).toBe(value);
    });

    it('should call newly registered value handler asynchronously with last resolved value', function() {
        var onResolve = jest.fn();
        var value = {a: 1, b: 2};

        resolve(value);
        jest.runAllTimers();
        reactivePromise.next(onResolve, noop);
        expect(onResolve).not.toBeCalled();

        jest.runAllTimers();
        expect(onResolve).toBeCalled();
        expect(onResolve.mock.calls[0][0]).toBe(value);
    });

    it('should not call pending value handlers after subsequent `resolve` calls', function() {
        var onResolveA = jest.fn();
        var onResolveB = jest.fn();

        reactivePromise.next(onResolveA, noop);
        reactivePromise.next(onResolveB, noop);
        resolve();
        resolve();
        jest.runAllTimers();
        expect(onResolveA.mock.calls.length).toBe(1);
        expect(onResolveB.mock.calls.length).toBe(1);
    });

    it('should not call pending value handlers after being canceled', function() {
        var onResolveA = jest.fn();
        var onResolveB = jest.fn();

        reactivePromise.next(onResolveA, noop);
        reactivePromise.next(onResolveB, noop);
        resolve();
        reactivePromise.cancel();
        jest.runAllTimers();
        expect(onResolveA).not.toBeCalled();
        expect(onResolveB).not.toBeCalled();
    });

    it('should call error handlers asynchronously with error passed to `reject`', function() {
        var onRejectA = jest.fn();
        var onRejectB = jest.fn();
        var error = new Error();

        reactivePromise.next(noop, onRejectA);
        reactivePromise.next(noop, onRejectB);
        reject(error);
        expect(onRejectA).not.toBeCalled();
        expect(onRejectB).not.toBeCalled();

        jest.runAllTimers();
        expect(onRejectA).toBeCalled();
        expect(onRejectB).toBeCalled();
        expect(onRejectA.mock.calls[0][0]).toBe(error);
        expect(onRejectB.mock.calls[0][0]).toBe(error);
    });

    it('should call error handlers when executor throws an error', function() {
        var reactivePromise = new ReactivePromise(function() {
            throw new Error();
        });
        var onRejectA = jest.fn();
        var onRejectB = jest.fn();

        reactivePromise.next(noop, onRejectA);
        reactivePromise.next(noop, onRejectB);
        jest.runAllTimers();
        expect(onRejectA).toBeCalled();
        expect(onRejectB).toBeCalled();
    });

    it('should call newly registered error handler asynchronously with thrown error', function() {
        var onReject = jest.fn();

        reject(new Error());
        jest.runAllTimers();
        reactivePromise.next(noop, onReject);
        expect(onReject).not.toBeCalled();

        jest.runAllTimers();
        expect(onReject).toBeCalled();
    });

    it('should not call pending error handlers after being canceled', function() {
        var onRejectA = jest.fn();
        var onRejectB = jest.fn();

        reactivePromise.next(noop, onRejectA);
        reactivePromise.next(noop, onRejectB);
        reject();
        reactivePromise.cancel();
        jest.runAllTimers();
        expect(onRejectA).not.toBeCalled();
        expect(onRejectB).not.toBeCalled();
    });

    it('should call destructor when being canceled', function() {
        var destructor = jest.fn();
        var reactivePromise = new ReactivePromise(function() {
            return destructor;
        });

        jest.runAllTimers();
        expect(destructor).not.toBeCalled();

        reactivePromise.cancel();
        expect(destructor).toBeCalled();
    });

    it('should call error handlers with error thrown by destructor', function() {
        var error = new Error();
        var reactivePromise = new ReactivePromise(function() {
            return function() {
                throw error;
            };
        });
        var onRejectA = jest.fn();
        var onRejectB = jest.fn();

        reactivePromise.next(noop, onRejectA);
        reactivePromise.next(noop, onRejectB);
        jest.runAllTimers();
        reactivePromise.cancel();
        jest.runAllTimers();
        expect(onRejectA).toBeCalled();
        expect(onRejectB).toBeCalled();
        expect(onRejectA.mock.calls[0][0]).toBe(error);
        expect(onRejectB.mock.calls[0][0]).toBe(error);
    });

    it('should eventually call error handlers with error thrown by destructor when rejecting', function() {
        var error = new Error();
        var reactivePromise = new ReactivePromise(function(resolve, reject) {
            setTimeout(reject);
            return function() {
                throw error;
            };
        });
        var onRejectA = jest.fn();
        var onRejectB = jest.fn();

        reactivePromise.next(noop, onRejectA);
        reactivePromise.next(noop, onRejectB);
        jest.runAllTimers();
        expect(onRejectA).toBeCalled();
        expect(onRejectB).toBeCalled();
        expect(onRejectA.mock.calls[0][0]).toBe(error);
        expect(onRejectB.mock.calls[0][0]).toBe(error);
    });

    it('should not call destructor on subsequent #cancel calls', function() {
        var destructor = jest.fn();
        var reactivePromise = new ReactivePromise(function() {
            return destructor;
        });

        jest.runAllTimers();
        reactivePromise.cancel();
        reactivePromise.cancel();
        reactivePromise.cancel();
        expect(destructor.mock.calls.length).toBe(1);
    });

    it('should call destructor after `reject` has been called', function() {
        var reject;
        var destructor = jest.fn();
        var reactivePromise = new ReactivePromise(function(_resolve, _reject) {
            reject = _reject;
            return destructor;
        });

        jest.runAllTimers();
        expect(destructor).not.toBeCalled();

        reject();
        expect(destructor).toBeCalled();
    });

    it('should throw an error on `resolve` calls after being canceled', function() {
        reactivePromise.cancel();
        expect(resolve).toThrow();
    });

    it('should throw an error on `reject` calls after being canceled', function() {
        reactivePromise.cancel();
        expect(reject).toThrow();
    });

    it('should call value handler with resolved reactivePromise', function() {
        var nestedValue = {a: 1};
        var nestedReactivePromise = new ReactivePromise(function(resolve) {
            resolve(nestedValue);
        });
        var onResolve = jest.fn();

        reactivePromise.next(onResolve, noop);
        resolve(nestedReactivePromise);
        jest.runAllTimers();
        expect(onResolve.mock.calls[0][0]).toEqual(nestedValue);
    });

    it('should reuse subsequently resolved equal reactivePromises', function() {
        var nestedResolve;
        var nestedReactivePromiseDestructor = jest.fn();
        var nestedReactivePromiseBase = jest.fn(function(resolve, reject) {
            nestedResolve = resolve;
            return nestedReactivePromiseDestructor;
        });
        var nestedReactivePromise = new ReactivePromise(nestedReactivePromiseBase);
        var nestedValue = {a: 1};
        var onResolve = jest.fn();

        reactivePromise.next(onResolve, noop);
        resolve(nestedReactivePromise);
        jest.runAllTimers();
        expect(nestedReactivePromiseBase.mock.calls.length).toBe(1)

        resolve(nestedReactivePromise);
        jest.runAllTimers();
        expect(nestedReactivePromiseBase.mock.calls.length).toBe(1)

        nestedResolve(nestedValue);
        jest.runAllTimers();
        expect(onResolve.mock.calls.length).toBe(1);
        expect(onResolve.mock.calls[0][0]).toEqual(nestedValue);

        resolve(new ReactivePromise(nestedReactivePromiseBase));
        jest.runAllTimers();
        expect(nestedReactivePromiseBase.mock.calls.length).toBe(1)
        expect(nestedReactivePromiseDestructor).not.toBeCalled();
        expect(onResolve.mock.calls.length).toBe(2);
        expect(onResolve.mock.calls[1][0]).toEqual(nestedValue);
    });
    
    it('should cancel nested reactivePromise when being canceled', function() {
        var nestedReactivePromiseDestructor = jest.fn();
        var nestedReactivePromise = new ReactivePromise(jest.fn(function() {
            return nestedReactivePromiseDestructor;
        }));

        resolve(nestedReactivePromise);
        jest.runAllTimers();
        expect(nestedReactivePromiseDestructor).not.toBeCalled();

        reactivePromise.cancel();
        expect(nestedReactivePromiseDestructor).toBeCalled();
    });

    it('should call error handler when nested reactivePromise throws an error', function() {
        var nestedReactivePromise = new ReactivePromise(jest.fn(function(resolve, reject) {
            reject(new Error());
        }));
        var onReject = jest.fn();

        reactivePromise.next(noop, onReject);
        resolve(nestedReactivePromise);
        jest.runAllTimers();
        expect(onReject).toBeCalled();
    });
 
    it('should call value handler with resolved enumerable', function() {
        var nestedReactivePromiseBase = function(resolve, reject) {
            resolve(nestedValue);
        };
        var onResolve = jest.fn()
        var nestedValue = {a: 1};

        reactivePromise.next(onResolve, noop);
        resolve({ nestedValue: new ReactivePromise(nestedReactivePromiseBase) });
        jest.runAllTimers();
        expect(onResolve.mock.calls[0][0]).toEqual({ nestedValue: nestedValue });

        resolve([new ReactivePromise(nestedReactivePromiseBase)]);
        jest.runAllTimers();
        expect(onResolve.mock.calls[1][0]).toEqual([nestedValue]);
    });

    it('should reuse reactivePromises in enumerable and cancel not reused', function() {
        var nestedReactivePromiseDestructorA = jest.fn();
        var nestedReactivePromiseDestructorB = jest.fn();
        var nestedReactivePromiseBaseA = jest.fn(function(resolve) {
            resolve(nestedValueA);
            return nestedReactivePromiseDestructorA;
        });
        var nestedReactivePromiseBaseB = jest.fn(function(resolve) {
            resolve(nestedValueB);
            return nestedReactivePromiseDestructorB;
        });
        var onResolve = jest.fn();
        var nestedValueA = {};
        var nestedValueB = {};
        var nestedValueC = {};
        var nestedValueD = {};

        reactivePromise.next(onResolve, noop);
        resolve({
            a: new ReactivePromise(nestedReactivePromiseBaseA),
            b: new ReactivePromise(nestedReactivePromiseBaseB),
            c: nestedValueC
        });
        jest.runAllTimers();
        expect(nestedReactivePromiseBaseA.mock.calls.length).toBe(1);
        expect(nestedReactivePromiseBaseB.mock.calls.length).toBe(1);
        expect(nestedReactivePromiseDestructorA).not.toBeCalled();
        expect(nestedReactivePromiseDestructorB).not.toBeCalled();
        expect(onResolve.mock.calls.length).toBe(1);
        expect(_.sortBy(Object.keys(onResolve.mock.calls[0][0]))).toEqual(['a', 'b', 'c']);
        expect(onResolve.mock.calls[0][0].a).toBe(nestedValueA);
        expect(onResolve.mock.calls[0][0].b).toBe(nestedValueB);
        expect(onResolve.mock.calls[0][0].c).toBe(nestedValueC);

        resolve({
            a: new ReactivePromise(nestedReactivePromiseBaseA),
            c: nestedValueD
        });
        jest.runAllTimers();
        expect(nestedReactivePromiseBaseA.mock.calls.length).toBe(1);
        expect(nestedReactivePromiseBaseB.mock.calls.length).toBe(1);
        expect(nestedReactivePromiseDestructorA).not.toBeCalled();
        expect(nestedReactivePromiseDestructorB).toBeCalled();
        expect(onResolve.mock.calls.length).toBe(2);
        expect(_.sortBy(Object.keys(onResolve.mock.calls[1][0]))).toEqual(['a', 'c']);
        expect(onResolve.mock.calls[1][0].a).toBe(nestedValueA);
        expect(onResolve.mock.calls[1][0].c).toBe(nestedValueD);
    });

    it('should cancel reactivePromises in enumerable when being canceled', function() {
        var nestedReactivePromiseDestructorA = jest.fn();
        var nestedReactivePromiseA = new ReactivePromise(jest.fn(function() {
            return nestedReactivePromiseDestructorA;
        }));

        resolve({ a: nestedReactivePromiseA });
        jest.runAllTimers();
        expect(nestedReactivePromiseDestructorA).not.toBeCalled();

        reactivePromise.cancel();
        expect(nestedReactivePromiseDestructorA).toBeCalled();
    });

    it('should call error handler and cancel reactivePromises in enumerable when any of them rejects', function() {
        var nestedReactivePromiseDestructorA = jest.fn();
        var nestedReactivePromiseDestructorB = jest.fn();
        var nestedReactivePromiseA = new ReactivePromise(jest.fn(function() {
            return nestedReactivePromiseDestructorA;
        }));
        var nestedReactivePromiseB = new ReactivePromise(jest.fn(function(resolve, reject) {
            setTimeout(reject);
            return nestedReactivePromiseDestructorB;
        }));
        var onReject = jest.fn();

        reactivePromise.next(noop, onReject);
        resolve({
            a: nestedReactivePromiseA,
            b: nestedReactivePromiseB,
        });
        jest.runAllTimers();
        expect(onReject).toBeCalled();
        expect(nestedReactivePromiseDestructorA).toBeCalled();
        expect(nestedReactivePromiseDestructorB).toBeCalled();
    });

    describe('#next result', function() {

        it('should be an instance of ReactivePromise', function() {
            expect(reactivePromise.next(noop, noop) instanceof ReactivePromise).toBe(true);
        });

        it('should resolve with values returned by value handler', function() {
            var onResolve = function(value) {
                return value.length;
            };
            var onResolveNext = jest.fn();
            
            reactivePromise.next(onResolve, noop).next(onResolveNext, noop);
            resolve('abc');
            jest.runAllTimers();
            expect(onResolveNext.mock.calls[0][0]).toBe(3);

            resolve('abcdef');
            jest.runAllTimers();
            expect(onResolveNext.mock.calls[1][0]).toBe(6);
        });

        it('should be canceled when former reactivePromise is canceled', function() {
            var destructorNext = jest.fn();
            var reactivePromiseNext = new ReactivePromise(function() {
                return destructorNext;
            });

            reactivePromise.next(function() { return reactivePromiseNext; }, noop);
            resolve();
            jest.runAllTimers();
            expect(destructorNext).not.toBeCalled();

            reactivePromise.cancel();
            jest.runAllTimers();
            expect(destructorNext).toBeCalled();
        });

        it('should be canceled when former reactivePromise throws an error', function() {
            var destructorNext = jest.fn();
            var reactivePromiseNext = new ReactivePromise(function() {
                return destructorNext;
            });

            reactivePromise.next(function() { return reactivePromiseNext; }, noop).next(noop, noop);
            resolve();
            jest.runAllTimers();
            expect(destructorNext).not.toBeCalled();

            reject();
            jest.runAllTimers();
            expect(destructorNext).toBeCalled();
        });

        it('should reject when error handler throws an error', function() {
            var onReject = jest.fn();

            reactivePromise.next(function() { throw new Error(); }, noop).next(noop, onReject);
            expect(onReject).not.toBeCalled();

            resolve();
            jest.runAllTimers();
            expect(onReject).toBeCalled();
        });

        it('should reject when error handler throws an error', function() {
            var onReject = jest.fn();

            reactivePromise.next(noop, function() { throw new Error(); }).next(noop, onReject);
            expect(onReject).not.toBeCalled();

            reject();
            jest.runAllTimers();
            expect(onReject).toBeCalled();
        });
    });
});
