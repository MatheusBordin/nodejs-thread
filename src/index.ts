import { Queue } from "./queue";

async function test() {
    const data: number[] = [];
    for (let i = 0; i < 1000; i++) {
        data.push(i);
    }

    const queue = new Queue<number, boolean>("./dist/script.js", 350, (err, item) => {
        console.log(`Finished item ${item}`);
    });

    queue.initialize();
    await queue.post(data, true);
    await queue.stop();

    console.log("Finish");
}

test();