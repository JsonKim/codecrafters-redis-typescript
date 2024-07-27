import * as net from "net";
import { DataType, parse, valueToArray, valueToString } from "./parser";
import { A, O, pipe } from "@mobily/ts-belt";
import { parseCliArgs } from "./cli-args";
import { getByKey, makeValue, setByKey } from "./database";

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Uncomment this block to pass the first stage
const server: net.Server = net.createServer((connection: net.Socket) => {
  // Handle connection
  connection.on("data", (data: Buffer) => {
    const parsedData = parse(data);

    if (O.isNone(parsedData)) {
      return;
    }

    const rest = pipe(parsedData, valueToArray, O.getExn);
    const command = pipe(rest, A.get(0), O.flatMap(valueToString), O.getExn);

    if (command === "PONG") {
      connection.write("+PONG\r\n");
      return;
    }

    if (command === "ECHO") {
      connection.write(`+${rest[1]?.value}\r\n`);
      return;
    }

    if (command === "SET") {
      const [_, key, value, __, px] = rest;
      setByKey(
        key?.value as string,
        makeValue(
          value?.value as string,
          Date.now(),
          px ? O.Some(Number(px.value)) : O.None
        )
      );
      connection.write("+OK\r\n");
      return;
    }

    if (command === "GET") {
      const key = rest[1]?.value as string;
      const value = getByKey(key);
      if (!value) {
        connection.write("$-1\r\n");
        return;
      }

      const expiredAt = pipe(
        value.px,
        O.map((px) => value.createAt + px)
      );

      if (expiredAt && expiredAt < Date.now()) {
        connection.write("$-1\r\n");
        return;
      }

      connection.write(`$${value.data.length}\r\n${value.data}\r\n`);

      return;
    }
  });
});

const args = parseCliArgs(process.argv);

server.listen(args.port, "127.0.0.1");
