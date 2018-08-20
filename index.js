const flatmap = (makeSource, combineResults) => inputSource => (start, sink) => {
    if (start !== 0) return;

    if (!combineResults) combineResults = (x, y) => y;

    let inputSourceTalkback;
    let index = 0;
    let currIdx = NaN;
    let talkbacks = {};
    let sourceEnded = false;
    let needNewInner = true;
    let endRequested = false;
    let firstErr;
    let msgQueue = [];
    let msgIdx = 0;
    let inloop = false;

    let loop = () => {
        inloop = true;
        while (true) {
            if (firstErr || endRequested) {
                for (let tb of Object.values(talkbacks)) tb(2);
                if (!sourceEnded) inputSourceTalkback(2);
            }
            let currTalkback = talkbacks[currIdx];
            if (firstErr || endRequested || (sourceEnded && !currTalkback)) {
                sink(2, firstErr);
                break;
            }
            if (currTalkback) {
                if (msgIdx >= msgQueue.length) break;
                currTalkback(1, msgQueue[msgIdx++]);
            }
            else {
                if (msgIdx < msgQueue.length) {
                    inputSourceTalkback(1, msgQueue[msgIdx]);
                }
                else if (needNewInner) {
                    needNewInner = false;
                    inputSourceTalkback(1);
                }
                else break;
            }
        }
        inloop = false;
    }

    let pullHandle = (t, d) => {
        if (t === 1) msgQueue.push(d);
        if (t === 2) endRequested = true;
        if ((t === 1 || t === 2) && !inloop) loop();
    }

    let makeSink = (i, d, talkbacks) =>
        (currT, currD) => {
            if (currT === 0) talkbacks[i] = currD;
            if (currT === 0 && Number.isNaN(currIdx)) currIdx = i;
            else if (currIdx === i) {
                if (currT === 1) {
                    msgQueue.shift();
                    msgIdx--;
                }
                if (currT === 2) {
                    needNewInner = msgQueue.length === 0;
                    currIdx = +Object.keys(talkbacks)[1];
                    msgIdx = 0;
                }
            }
            if (currT === 1) sink(1, combineResults(d, currD));
            if (currT === 2) {
                delete talkbacks[i];
                firstErr = firstErr || currD;
            }
            if (currT === 0 || currT === 1 || currT === 2) {
                if (!inloop) loop();
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
            firstErr = firstErr || d;
        }
        if ((t === 0 || t === 2) && !inloop) loop();
    });
}

module.exports = flatmap;
