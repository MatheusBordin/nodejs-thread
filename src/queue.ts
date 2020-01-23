import { Thread } from "./thread";

export type QueueHandler<T> = (error: Error, data: T) => void;

/**
 * Parallel queue.
 *
 * @export
 * @class Queue
 * @template K
 * @template T
 */
export class Queue<K, T> {
    private _consumerScript: string;
    private _concurrence: number;
    private _handler: QueueHandler<T>;
    private _queue: Array<K>;
    private _pool: Array<Thread<K, T>>;
    private _availableThread: Array<number>;
    private _active = false;
    private _onceResolver: any;
    
    constructor(consumerScript: string, concurrence: number, handler?: QueueHandler<T>) {
        this._consumerScript = consumerScript;
        this._concurrence = concurrence;
        this._queue = [];
        this._pool = [];
        this._availableThread = [];
        this._handler = handler;
    }

    /**
     * Initialize threads.
     *
     * @memberof Queue
     */
    public initialize() {
        this._active = true;

        for (let i = 0; i < this._concurrence; i++) {
            this._pool.push(
                new Thread(this._consumerScript),
            );

            this._availableThread.push(i);
        } 

        this._fillThreads();
    }

    /**
     * Pause consumer.
     *
     * @memberof Queue
     */
    public pause() {
        this._active = false;
    }

    /**
     * Resume consumer.
     *
     * @memberof Queue
     */
    public resume() {
        this._active = true;
        this._fillThreads();
    }

    /**
     * Close all threads.
     *
     * @memberof Queue
     */
    public async stop() {
        this._active = false;

        while (this._availableThread.length != this._concurrence) {
            await Thread.Sleep(1000);
        }

        for (const item of this._pool) {
            item.close();
        }
    }

    
    /**
     * Post items in queue.
     *
     * @param {(K | K[])} items Items to be consumed.
     * @memberof Queue
     */
    public post(items: K | K[], once = false) {
        return new Promise((res) => {
            if (items instanceof Array) {
                this._queue.push(...items);
            } else {
                this._queue.push(items);
            }
    
            if (this._availableThread.length > 0) {
                this._fillThreads();
            }

            if (once) {
                this._onceResolver = res;
            } else {
                res();
            }
        });
    }

    /**
     * Create a thread.
     *
     * @private
     * @returns
     * @memberof Queue
     */
    private async _createThread() {
        return new Thread(this._consumerScript);
    }

    /**
     * Fill threads with messages.
     *
     * @private
     * @memberof Queue
     */
    private _fillThreads() {
        while (this._availableThread.length > 0 && this._queue.length > 0) {
            this._consume();
        }
    }

    /**
     * Consume item.
     * 
     * @private
     * @returns
     * @memberof Queue
     */
    private _consume() {
        if (!this._active || this._availableThread.length === 0 || this._queue.length === 0) {
            return;
        }

        const item = this._queue.shift();
        const threadIdx = this._availableThread.shift();

        const thread = this._pool[threadIdx];
        thread.post(item)
            .then((val) => this._resolve(threadIdx, null, val))
            .catch((err) => this._resolve(threadIdx, err, null));
    }

    /**
     * Resolve thread.
     *
     * @private
     * @param {number} threadIdx
     * @param {Error} err
     * @param {T} response
     * @memberof Queue
     */
    private _resolve(threadIdx: number, err: Error, response: T) {
        this._availableThread.push(threadIdx);
        if (this._handler) {
            this._handler(err, response);
        }

        this._fillThreads();

        if (this._onceResolver != null && this._queue.length === 0) {
            this._onceResolver();
        }
    }
}