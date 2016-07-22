# funga

## Installation

```
npm install --save funga
```

It's an isomorphic module, so you can use it with [Browserify](https://github.com/substack/node-browserify) 
or [webpack](https://github.com/webpack/webpack).

If you want to use it with [RequireJS](https://github.com/requirejs/requirejs) or as global variable in browser environment
you have to run `npm run build` - it will create `funga.min.js` script in UMD format under `build/` directory.

## Usage

```javascript
const funga = require('funga');
```

### emit

`funga.emit` creates emitter factory.  
Function passed to `funga.emit` (we will refer to this function as base) will be used to run emitter.  
base is always called with two functions.  
First one is used to emit values. This function may be called more than once.  
Second one is used to emit error and may be called only once. After that neither one of these two functions can be called.  
Rest of the parameters passed to base are the ones you pass to emitter factory when creating emitter.

```javascript
const emitRange = funga.emit(
    function base(emit, fail, from, to) {
        var counter = from;
        var interval = setInterval(function() {
            if (counter > to) {
                return fail(new Error('limit exceeded'));
            }
            emit(counter);
            counter++;
        }, 1000);

        return function destructor() {
            clearInterval(interval);
        };
    }
);

const rangeEmitter = emitRange(1, 10);
```

Until you call `next`, base will not be called.

```javascript
rangeEmitter.next(console.log, console.error);
```

In above example, each number from 1 to 10 will be logged.   
After that, emitter fails with error containing 'limit exceeded' message.  
When this happens, destructor (function returned by base) will be called.  
You may destroy emitter at any moment by calling `destroy` method.

### consume

`funga.consume` creates consumer factory.  
Consumer is of Emitter type (so it exposes `next` and `destroy` methods).  
From Emitter it differs in how values are emitted.  
Instead of base, you pass digest function when creating factory.

```javascript
const consumeRanges = funga.consume(
    function digest(numberA, numberB, numberC) {
        return {
            A: numberA,
            B: numberB,
            C: numberC
        };
    }
);
```

Consumer may be fed with emitters, but values passed to digest will be values emitted by them.

```javascript
const rangesConsumer = consumeRanges(emitRange(1, 10), emitRange(11, 20), emitRange(21, 30));
```

After all emitters emit values, digest will be called and consumer will emit value returned by it.  
After that, every time new value is emitted, digest will be called and consumer will emit new value.  
If digest throws an error, consumer will fail and all emitters, that consumer was fed with, will be destroyed.  


```javascript
rangesConsumer.next(console.log, console.error);
```

In above example, consumer will emit objects `{ A: <number 1-10>, B: <number 11-20>, C: <number 21-30>}`.
Eventually, when one of the consumed emitters fail, consumer will also fail and the rest of emitters will be destroyed.

### resolve

`funga.resolve` creates factory using another factory (one returned by `funga.emit` or `funga.consume`).  

```javascript
const emitEmitter = funga.emit(function (emit, fail) {
    emit(emitRange(1, 10));
});

const emitEmitterAndResolve = funga.resolve(emitEmitter);

const emitter = emitEmitterAndResolve();

emitter.next(console.log, console.error);
```

Now, because emitEmitter was wrapped using `funga.resolve`, numbers from 1 to 10 will be logged and then emitter will fail.  
That's not very impressive: we could just call `emitRange` and we would end up with the exactly same result.  
Interesting thing happens, when you subsequently emit equal emitters:

```javascript
const emitEmitterAndResolve = funga.resolve(
    funga.emit(function (emit, fail) {
        var interval = setInterval(function() {
            emit(emitRange(1, 10));
        }, 100);

        return function() {
            clearInterval(interval):
        };
    })
);

const emitter = emitEmitterAndResolve();

emitter.next(console.log, console.error);
```

What will happen now? Again, number from 1 to 10 will be logged and after that emitter will fail.  
Emitter returned by `emitRange(1, 10)` will run only once (even if has been emitted multiple times)!  
Because emitter was created from factory wrapped in `funga.resolve`, it knows when subsequently emitted emitter is the same as the last one and, instead of calling it again, skips and uses already running.  

When subsequently emitted emitter differs, the last one is destroyed and replaced be the new one.

```javascript 
const emitEmitterAndResolve = funga.resolve(
    funga.emit(function (emit, fail) {
        var timeout = setTimeout(function() {
            emit(emitRange(101, 200));
        }, 5000);

        emit(emitRange(1, 100));

        return function() {
            clearTimeout(timeout);
        };
    })
);

const emitter = emitEmitterAndResolve();

emitter.next(console.log, console.error);
```

In above example, numbers from range 1-100 will be emitted (not all, only the ones that will be emitted within 5 seconds period).
Then emitter will start emitting numbers starting from 101 and will fail after reaching 200.

When using `funga.resolve` also emitters returned in object are resolved.

```javascript
const emitEmitterAndResolve = funga.resolve(
    funga.emit(function (emit, fail) {
        emit({
            A: emitRange(1, 10),
            B: emitRange(11, 20),
            C: Infinity
        });
    })
);
const emitter = emitEmitterAndResolve();

emitter.next(console.log, console.error);
```

In above example emitter will emit objects `{ A: <number 1-10>, B: <number 11-20>, C: Infinity }`.

Emitters in object/array are reused, if emitters indexed by the same key are equal.

```javascript
const consumeNumberAndResolve = funga.resolve(
    funga.consume(function (number) {
        if (number < 5) {
            return {
                A: emitRange(1, 10),
                B: emitRange(21, 30),
                C: 'C'
            };
        } else {
            return {
                A: emitRange(1, 10),
                B: emitRange(11, 20),
                C: emitRange(21, 30)
            };
        }
    })
);
const emitter = consumeNumberAndResolve(emitRange(1, 10));

emitter.next(console.log, console.error);
```

In above example, as long as consumed emitter will emit numbers below 5, emitter will emit objects `{ A: <number 1-10>, B: <number 21-30>, C: 'C' }`.  
Until then emitters indexed by 'A' and 'B' will be reused.  
After consuming numbers starts to be equal or greater than five, emitter will start emitting objects `{ A: <number 1-10>, B: <number 11-20>, C: <number 21-30> }`.  
Emitter indexed by 'B' will be destroyed and replaced with new one. Emitter indexed by 'A' won't be destroyed. 
