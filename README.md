# callbag-flat-map 👜

A callbag operator that creates and flates to the new source whenever original source emits

`npm install callbag-flat-map`

## Usage:

Pullable Source

```js
const pipe = require('callbag-pipe');
const flatMap = require('callbag-flat-map');
const fromIter = require('callbag-from-iter');
const forEach = require('callbag-for-each');


console.log('Pullable source');
pipe(
  fromIter('hi'),
  flatMap(char => fromIter([10, 20, 30]), (char,num) => char + num),
  forEach(x => console.log(x))
);

// Pullable source
// h10
// h20
// h30
// i10
// i20
// i30
```

Listenable Source

```js
const pipe = require('callbag-pipe');
const flatMap = require('callbag-flat-map');
const interval = require('callbag-interval');
const forEach = require('callbag-for-each');
const fromPromise = require('callbag-from-promise');

const fakeAjax = value => new Promise((resolve, reject) => {
	let period = value % 2 ? 400 : 1200; // Resolve odd numbers quickly
	setTimeout(resolve, period, (value*value));
});


console.log('Listenable source');
pipe(
  interval(500),
  flatMap(i => fromPromise(fakeAjax(i))),
  forEach(x => console.log(x))
);

// Listenable source
// 1
// 0
// 9
// 4
// 25
// 16
// 49
// 36
// ....
```
