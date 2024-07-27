type CliArgs = {
  port: number;
  directory: string;
  replicaof: string;
};

export const parseCliArgs = (args: string[]): CliArgs => {
  const defaultArgs: CliArgs = {
    port: 6379,
    directory: "./public",
    replicaof: "",
  };

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]!.replace(/^--/, "");
    const value = args[i + 1]!;

    switch (key) {
      case "port":
        defaultArgs.port = parseInt(value, 10);
        if (isNaN(defaultArgs.port)) {
          throw new Error("Port must be a number");
        }
        break;
      case "directory":
        defaultArgs.directory = value;
        break;
      case "replicaof":
        defaultArgs.replicaof = value;
        break;
    }
  }

  return defaultArgs;
};
