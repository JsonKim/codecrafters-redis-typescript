export const makeBulkString = (value: string): string => {
  return `$${value.length}\r\n${value}\r\n`;
};
