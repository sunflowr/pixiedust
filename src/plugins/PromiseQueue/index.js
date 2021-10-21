/**
 * Promise based queue.
 */
export class PromiseQueue {
    /** Constructor, does what's on the tin. */
    constructor() {
      this._queue = [];
      this._working = false;
      this._stop = false;
    }

    /** Is the queue busy? */
    get isWorking() { return this._working; }
    /** Is the queue empty? */
    get isEmpty() { return this._queue.length === 0; }

    /** Reset the queue after a stop. */
    reset() { this._stop = false; }

    /** Stops the queue after current promise and empty the queue. */
    stop() { this._stop = true; }

    /**
     * Queues a promise. Also execute it if queue is empty.
     * @param {Promise} promise 
     * @returns {Promise}
     */
    queue(promise) {
        const that = this;
        return new Promise((resolve, reject) => {
            that._queue.push({
                promise: promise,
                resolve: resolve,
                reject: reject
            });
            that.dequeue();
        });
    }

    /**
     * Dequeue and execute a promise if not busy.
     */
    dequeue() {
        if(this.isWorking) {
            return;
        }
        if(this._stop) {
            this._queue = [];
            this._stop = false;
            return;
        }
        const item = this._queue.shift();
        if(!item) {
            return;
        }
        try
        {
            const that = this;
            this._working = true;
            item.promise()
            .then(value => {
                that._working = false;
                item.resolve(value);
                that.dequeue();
            })
            .catch(err => {
                that._working = false;
                item.reject(err);
                that.dequeue();
            });
        } catch(err) {
            this._working = false;
            item.reject(err);
            this.dequeue();
        }
    }
}
