'use strict';

const wait = (t) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, t);
  });
};

const defer = () => {
  let res, rej;
  const promise = new Promise((resolve, reject) => {
    res = resolve;
    rej = reject;
  });

  promise.resolve = res;
  promise.reject = rej;

  return promise;
};

let promiseArr = [];
let accumulatedValue = 0;
let isTimeout = false;
let lastCallTime = 0;
const bufferFunc = async (val) => {
  accumulatedValue += val;

  const promise = defer();
  promiseArr.push(promise);

  if (isTimeout) return promise;
  const now = Date.now();
  setTimeout(async () => {
    console.log('Running Buffered Requests');
    await wait(Math.floor(Math.random() * 100 + 10)); // Simulate API Call
    isTimeout = false;
    lastCallTime = Date.now();
    promiseArr = promiseArr.filter((promiseVal) => {
      promiseVal.resolve(accumulatedValue);
      return false;
    });
    accumulatedValue = 0;
  }, lastCallTime + 200 - now);
  console.log('lastCallTime', lastCallTime + 200 - now);
  isTimeout = true;
  return promise;
};


(async () => {
  for (let i=0; i<100; i++) {
    await wait(Math.floor(Math.random() * 200 + 10));
    (async () => {
      console.log(`New request (index ${i})`);
      const result = await bufferFunc(1);
      console.log(result);
    })();
  }
})();
