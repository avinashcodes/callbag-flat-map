const test = require('tape');
const fromPromise = require('callbag-from-promise');
const fromIter = require('callbag-from-iter');
const flatMap = require('./index');

function* range(from, to) {
	let i = from;
	while (i <= to) yield i++;
}

const listenableOf = (...values) => (start, sink) => {
	if (start !== 0) return;
	let end = false;
	sink(0, (t, d) => {
		if (t === 2) end = true;
	});
	for (const i of values) {
		if (end) break;
		sink(1, i);
	}
	sink(2);
};

test('it creates a new source for every value emitted by input source', t=>{
	'use strict';
	let values = [1,2,3];

	let expectedCombineValues = [[1, 1],[3, 9],[2, 4]];
	let expectedValues = ["1 1","3 9","2 4"];
	const doSomething = value => {
		t.equal(value, values.shift(), 'makeSource called everytime inputSource emits')
		return new Promise(function (resolve, reject) {
			let period = value % 2 ? 400 : 1000;
			setTimeout(resolve, period, (value*value));
		});
	};
	const combineValues = (value1, value2) => {
		t.deepEqual([value1, value2], expectedCombineValues.shift(), 'combineResults called with input source result and applied source result');
		return (value1 + " " + value2);
	};
	const inputSource = (start, sink) => {
		if(start !== 0) return;
		sink(0, (t,d) => {
			if(t === 2) clearInterval(emitter);
		});
		let count = 1;
		let emitter = setInterval(function(){
			if(count === 4){
				clearInterval(emitter);
				setTimeout(function(){sink(2)}, 1500);
				return;
			}
			sink(1, count++);
		}, 500);

	};
	const outputSource = flatMap(x => fromPromise(doSomething(x)), combineValues)(inputSource);
	outputSource(0, (type,d) => {
		if(type === 1) {
			t.equal(d, expectedValues.shift(), "Got the result when emitted");
		}
	});
	setTimeout(() => t.end(), 4000);
});

test('it should stop emitting when sink unsubscribes', t=>{
	'use strict';
	const doSomething = value => {
		t.equal(value, 1, 'makeSource called everytime inputSource emits and before sink unsubsribes')
		return new Promise(function (resolve, reject) {
			setTimeout(resolve, 1000, (value*value));
		});
	};
	const inputSource = (start, sink) => {
		if(start !== 0) return;
		sink(0, (t,d) => {
			if(t === 2) clearInterval(emitter);
		});
		let count = 1;
		let emitter = setInterval(function(){
			if(count === 4){
				clearInterval(emitter);
				setTimeout(function(){sink(2)}, 1500);
				return;
			}
			sink(1, count++);
		}, 1500);

	};
	const outputSource = flatMap(x => fromPromise(doSomething(x)))(inputSource);
	let talkback;
	outputSource(0, (type,d) => {
		if(type === 0) talkback = d;
		if(type === 1) {
			t.equal(d, 1, "Got only the results before unsubscribing");
			t.pass('When combineResults function is not specified, default to inner source');
			talkback(2);
		}
	});
	setTimeout(() => t.end(), 4000);
});

test('it should flatten pullable inner sources to a pullable output source', t=>{
	'use strict';
	const doSomething = () => fromIter(range(0, 2));
	const inputSource = fromIter(range(0, 2));
	const outputSource = flatMap(doSomething, (a, b) => a + '-' + b)(inputSource);
	const expectedValues = ['0-0', '0-1', '0-2', '1-0', '1-1', '1-2', '2-0', '2-1', '2-2'];
	const actualValues = [];
	let talkback;
	let stopped = false;
	outputSource(0, (type, d) => {
		if (type === 0) talkback = d;
		if (type === 1) actualValues.push(d);
		if (type === 2) stopped = true;
	});
	t.equal(actualValues.length, 0, 'Got no values before first pull');
	for (let i = 0; i < expectedValues.length; i++) {
		talkback(1);
		t.equal(actualValues.length, i + 1, 'Got 1 value on each pull');
	}
	t.deepEqual(actualValues, expectedValues, 'Got all values in the right order');
	t.notOk(stopped, 'Got no end before additional pull');
	talkback(1);
	t.ok(stopped, 'Got end on additional pull');
	t.end();
});

test('it should flatten pullable inner sources to a pullable output source even if the input source is listenable', t=>{
	'use strict';
	const doSomething = () => fromIter(range(0, 2));
	const inputSource = listenableOf(0, 1, 2);
	const outputSource = flatMap(doSomething, (a, b) => a + '-' + b)(inputSource);

	const expectedValues = ['0-0', '0-1', '0-2', '1-0', '1-1', '1-2', '2-0', '2-1', '2-2'];
	const actualValues = [];
	let talkback;
	let stopped = false;
	outputSource(0, (type, d) => {
		if (type === 0) talkback = d;
		if (type === 1) actualValues.push(d);
		if (type === 2) stopped = true;
	});
	t.equal(actualValues.length, 0, 'Got no values before first pull');
	for (let i = 0; i < expectedValues.length; i++) {
		talkback(1);
		t.equal(actualValues.length, i + 1, 'Got 1 value on each pull');
	}
	t.deepEqual(actualValues, expectedValues, 'Got all values in the right order');
	t.notOk(stopped, 'Got no end before additional pull');
	talkback(1);
	t.ok(stopped, 'Got end on additional pull');
	t.end();
});

test('it should immediately send upstream messages to the oldest inner source without waiting for a push response to the previous message', t=>{
	t.plan(3);
	const doSomething = value => (start, sink) => {
		if (start !== 0) return;
		let buffer = [];
		sink(0, (t, d) => {
			if (t === 1) {
				if (d !== value) buffer.push(d);
				else {
					buffer.forEach(x => sink(1, x));
					sink(2);
				}
			}
			if (t === 2) sink(2);
		});
	};
	const inputSource = listenableOf(0, 3, 6);
	const outputSource = flatMap(doSomething, (a, b) => a + '-' + b)(inputSource);

	const expectedValues = ['3-0', '3-1', '3-2', '6-3', '6-4', '6-5'];
	const actualValues = [];
	let talkback;
	outputSource(0, (type, d) => {
		if (type === 0) talkback = d;
		if (type === 1) actualValues.push(d);
		if (type === 2) {
			t.equal(actualValues.length, expectedValues.length, 'Got only the right values');
			t.deepEqual(actualValues, expectedValues, 'Got all values in the right order');
			t.end();
		};
	});
	t.equal(actualValues.length, 0, 'Got no values before first pull');
	for (let i = 0; i <= expectedValues.length; i++) talkback(1, i);
});

test('it should re-send upstream messages to the next inner source when the previous one stopped without pushing back a value', t=>{
	t.plan(3);
	const doSomething = value => (start, sink) => {
		if (start !== 0) return;
		let ids = [];
		let endId;
		sink(0, (t, d) => {
			if (t === 1) {
				if (endId) return;
				if (d === value) endId = setTimeout(() => sink(2));
				else ids.push(setTimeout(() => {
					ids.shift();
					sink(1, d);
				}));
			}
			if (t === 2) {
				ids.forEach(clearTimeout);
				clearTimeout(endId);
				sink(2);
			}
		});
	};
	const inputSource = listenableOf(0, 3, 6);
	const outputSource = flatMap(doSomething, (a, b) => a + '-' + b)(inputSource);

	const expectedValues = ['3-0', '3-1', '3-2', '6-3', '6-4', '6-5'];
	const actualValues = [];
	let talkback;
	let timeout;
	outputSource(0, (type, d) => {
		if (type === 0) talkback = d;
		if (type === 1) actualValues.push(d);
		if (type === 2) {
			t.equal(actualValues.length, expectedValues.length, 'Got only the right values');
			t.deepEqual(actualValues, expectedValues, 'Got all values in the right order');
			t.end();
			clearTimeout(timeout);
		};
	});
	setTimeout(() => {
		t.equal(actualValues.length, 0, 'Got no values before first pull');
		for (let i = 0; i <= expectedValues.length; i++) talkback(1, i);
		timeout = setTimeout(() => t.end(), 2000);
	});
});

test('it should not overflow the stack when delivering a message to many empty pullable inner sources', t=>{
	const doSomething = () => (start, sink) => {
		if (start !== 0) return;
		sink(0, (t, d) => {
			if (t === 1 || t === 0) sink(2);
		});
	};
	const inputSource = (start, sink) => {
		if (start !== 0) return;
		let end = false;
		sink(0, (t, d) => {
			if (t === 2) end = true;
		});
		for (let i = 0; i < 10000; i++) {
			if (end) break;
			sink(1, i);
		}
		sink(2);
	};
	const outputSource = flatMap(doSomething)(inputSource);
	let stopped = false;
	let talkback;
	outputSource(0, (type, d) => {
		t.notEqual(type, 1, 'Never got any value');
		if (type === 0) talkback = d;
		if (type === 2) stopped = true;
	});
	t.notOk(stopped, 'Got no end before first pull');
	t.doesNotThrow(() => talkback(1), null, 'No error thrown on pull');
	t.ok(stopped, 'Got end on first pull');
	t.end();
});
