const test = require('tape');
const fromPromise = require('callbag-from-promise');
const flatMap = require('./index');

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