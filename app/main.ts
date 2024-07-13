import * as net from "net";

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Uncomment this block to pass the first stage
const server: net.Server = net.createServer((connection: net.Socket) => {
  // Handle connection
  connection.on("data", (data: Buffer) => {
    const command = data.toString().trim().split("\r\n");
    if (command.length === 3 && command[2] === "PING") {
      connection.write("+PONG\r\n");
      return;
    }
    if (command.length === 5 && command[2] === "ECHO") {
      connection.write(`+${command[4]}\r\n`);
      return;
    }
  });
});

server.listen(6379, "127.0.0.1");
