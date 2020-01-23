import { Worker } from "worker_threads";

/**
 * Thread promise-like implementation.
 *
 * @export
 * @class Thread
 * @template K The data sent type.
 * @template T The data received type.
 */
export class Thread<K, T> {
    private _worker: Worker;
    private _resolver: any;
    private _rejector: any;

    /**
     * Execute once.
     *
     * @static
     * @template K The data sent type.
     * @template T The data received type.
     * @param {string} script Script to be executed.
     * @param {K} data Data sent.
     * @returns
     * @memberof Thread
     */
    public static async Execute<K, T>(script: string , data: K) {
        const thread = new Thread<K, T>(script);
        const result = await thread.post(data);
        thread.close();

        return result;
    }

    /**
     * Sleep thread.
     *
     * @static
     * @param {number} time Time to sleep.
     * @returns {Promise<void>}
     * @memberof Thread
     */
    public static Sleep(time: number): Promise<void> {
        return new Promise((res) => {
            setTimeout(res, time);
        });
    }

    /**
     * Creates an instance of Thread.
     * 
     * @param {string} script
     * @memberof Thread
     */
    constructor(script: string) {
        this._worker = new Worker(script);
        this._worker.on("message", (val: T) => this._receiveMessage(null, val));
        this._worker.on("error", (err: Error) => this._receiveMessage(err));
        this._worker.on("exit", (signal: number) => {
            if (signal === 0) {
                return this._receiveMessage(new Error("Internal error"));
            }

            this._receiveMessage(null, null);
        });
    }

    /**
     * Return thread id.
     *
     * @readonly
     * @memberof Thread
     */
    public get id() {
        return this._worker.threadId;
    }

    /**
     * Post new message;
     *
     * @param {K} value
     * @returns {Promise<T>}
     * @memberof Thread
     */
    public post(value: K): Promise<T> {
        return new Promise((resolve, reject) => {
            this._resolver = resolve;
            this._rejector = reject;
            this._worker.postMessage(value);
        });
    }

    /**
     * Close thread.
     *
     * @memberof Thread
     */
    public close() {
        this._worker.terminate();
    }

    /**
     * Receive message handler.
     *
     * @private
     * @param {Error} err
     * @param {T} [data]
     * @returns {void}
     * @memberof Thread
     */
    private _receiveMessage(err: Error, data?: T): void {
        if (!this._resolver || !this._rejector) {
            return;
        }

        if (err) {
            return this._rejector(err);
        }

        this._resolver(data);
    }
}