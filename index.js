const flatmap = (makeSource, combineResults) => inputSource => (start, sink) => {
    if (start !== 0) return;

    if (!combineResults) combineResults = (x, y) => y;

    let index = 0;
    let talkbacks = {};
    let sourceEnded = false;

    let pullHandle = (t, d) => {
        var currTalkback = Object.values(talkbacks).pop();
        if (t === 1) {
            if (currTalkback) currTalkback(1);
            else if (!sourceEnded) inputSourceTalkback(1);
            else sink(2);
        }
        if (t === 2) {
            if (currTalkback) currTalkback(2);
            inputSourceTalkback(2);
        }
    }

    let stopOrContinue = d => {
        if (sourceEnded && Object.keys(talkbacks).length === 0) sink(2, d);
        else inputSourceTalkback(1);
    }

    let makeSink = (i, d, talkbacks) =>
        (currT, currD) => {
            if (currT === 0) talkbacks[i] = currD;
            if (currT === 1) sink(1, combineResults(d, currD));
            if (currT === 0 || currT === 1) talkbacks[i](1);
            if (currT === 2) {
                delete talkbacks[i];
                stopOrContinue(currD);
            }
        }

    inputSource(0, (t, d) => {
        if (t === 0) {
            inputSourceTalkback = d;
            sink(0, pullHandle);
        }
        if (t === 1) {
            makeSource(d)(0, makeSink(index++, d, talkbacks));
        }
        if (t === 2) {
            sourceEnded = true;
            stopOrContinue(d);
        }
    });
}

module.exports = flatmap;