import * as chalk from "chalk";

type ParallelHandler = (index: number) => void;

/**
 * Parallel options.
 *
 * @interface IParallelOptions
 */
interface IParallelOptions {
  name: string;
  count: number;
  concurrency: number;
  consumerHandler: ParallelHandler;
}

/**
 * Parallel implementation.
 *
 * @class Parallel
 */
export class Parallel {
  /**
   * Create parallel instance.
   *
   * @static
   * @param {Function} handler Consumer handler
   * @param {Number} count Count of executions
   * @param {Number} concurrency Max concurrency size
   * @returns
   * @memberof Parallel
   */
  public static create(name: string, handler: ParallelHandler, count: number, concurrency: number) {
    const process = new Parallel({
      name,
      count,
      concurrency,
      consumerHandler: handler,
    });

    process.start();

    return process;
  }

  private name: string;
  private count: number;
  private offsetCount: number;
  private concurrency: number;
  private handler: ParallelHandler;
  private paused: boolean;
  private processingCount: number;
  private finishHandler: () => void;

  constructor(options: IParallelOptions) {
    this.name = options.name;
    this.count = options.count;
    this.concurrency = options.concurrency || options.count;
    this.handler = options.consumerHandler;
    this.offsetCount = 0;
    this.paused = false;
    this.processingCount = 0;

    if (this.count < this.concurrency) {
        this.concurrency = this.count;
    }
  }

  /**
   * Return current offset.
   *
   * @readonly
   * @memberof Parallel
   */
  public get offset() {
    return this.offsetCount;
  }

  /**
   * Return current processing count.
   *
   * @readonly
   * @memberof Parallel
   */
  get processing() {
    return this.processingCount;
  }

  /**
   * Start process.
   * Cannot use that, use static generator intead.
   *
   * @memberof Parallel
   */
  public start() {
    for (let i = 0; i < this.concurrency; i++) {
      this.consume();
    }
  }

  /**
   * Pause parallel running process.
   *
   * @returns
   * @memberof Parallel
   */
  public pause() {
    if (this.processingCount === 0 || this.pause) {
      console.warn(`[${this.name}] Pause method called on stoped parallel instance`);
      return Promise.resolve();
    }

    this.paused = true;

    return new Promise(async (res) => {
      while (this.processingCount > 0) {
        await this.sleep(500);
        console.log(`[${this.name}] Processing: ${this.processingCount}`);
      }

      res();
    });
  }

  /**
   * Resume paused process.
   *
   * @returns
   * @memberof Parallel
   */
  public resume() {
    if (this.processingCount > 0) {
      console.warn(`[${this.name}] Resume method cannot be called at running parallel instance`);
      return false;
    }

    this.paused = false;
    this.concurrency = Math.min(this.concurrency, this.count - this.concurrency);

    for (let i = 0; i < this.concurrency; i++) {
      this.consume();
    }
  }

  /**
   * Wait for all work be done.
   *
   * @returns
   * @memberof Parallel
   */
  public waitFinish() {
    if (this.offsetCount === this.count) {
      return Promise.resolve();
    }

    return new Promise((res) => {
      this.finishHandler = res;
    });
  }

  /**
   * Consume message.
   *
   * @memberof Parallel
   */
  private async consume() {
    this.processingCount++;
    this.offsetCount++;

    try {
      await this.handler(this.offsetCount);
    } catch (e) {
      try {
        await new Promise(res => setTimeout(res, 5000));
        await this.handler(this.offsetCount);
      } catch (er) {
        console.log(chalk`[${this.name}] {red Error} processing message with offset: ${this.offsetCount.toString()}`);
      }
    }

    this.processingCount--;

    if (this.offsetCount === this.count) {
      // Finish
      if (this.finishHandler != null) {
        this.finishHandler();
      }
    } else if (!this.paused && this.offsetCount + this.processingCount < this.count) {
      // Is not finish and not paused
      this.consume();
    }
  }

  /**
   * Sleep time.
   *
   * @param {Number} time Time to sleep
   * @returns
   * @memberof Parallel
   */
  private sleep(time: number) {
    return new Promise((res) => {
      setTimeout(res, time);
    });
  }
}
