import { parentPort } from "worker_threads";

parentPort.on("message", (data: number) => {
    setTimeout(() => parentPort.postMessage(data), Math.random() * 4000);
});