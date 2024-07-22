import * as net from "net";
import { DataType, parse } from "./parser";
import { O } from "@mobily/ts-belt";

const database = new Map<string, string>();

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Uncomment this block to pass the first stage
const server: net.Server = net.createServer((connection: net.Socket) => {
  // Handle connection
  connection.on("data", (data: Buffer) => {
    const command = parse(data);

    if (O.isNone(command)) {
      return;
    }

    if (command.type === DataType.Array && command.value.length === 1) {
      if ((command.value[0].value = "PONG")) {
        connection.write("+PONG\r\n");
        return;
      }
    }

    if (command.type === DataType.Array && command.value.length === 2) {
      if (command.value[0].value === "ECHO") {
        connection.write(`+${command.value[1].value}\r\n`);
        return;
      }
    }

    if (command.type === DataType.Array && command.value.length === 3) {
      if (command.value[0].value === "SET") {
        const [_, key, value] = command.value;
        database.set(key.value as string, value.value as string);
        connection.write("+OK\r\n");
        return;
      }
    }

    if (command.type === DataType.Array && command.value.length === 2) {
      if (command.value[0].value === "GET") {
        const key = command.value[1].value as string;
        const value = database.get(key);
        if (value) {
          connection.write(`$${value.length}\r\n${value}\r\n`);
        }
        return;
      }
    }
  });
});

server.listen(6379, "127.0.0.1");
