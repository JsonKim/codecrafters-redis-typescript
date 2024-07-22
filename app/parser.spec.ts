// parser.spec.ts
import { Buffer } from "buffer";
import { parseWithState, DataType, ParseResult, ParseState } from "./parser";
import { describe, it, expect } from "bun:test";

describe("parse function", () => {
  it("should parse number correctly", () => {
    const state: ParseState = { input: Buffer.from(":123\r\n"), index: 0 };
    const expected: ParseResult = {
      data: { type: DataType.Number, value: 123 },
      state: { input: state.input, index: 6 },
    };
    expect(parseWithState(state)).toEqual(expected);
  });

  it("should parse simple string correctly", () => {
    const state: ParseState = {
      input: Buffer.from("+Hello, World!\r\n"),
      index: 0,
    };
    const expected: ParseResult = {
      data: { type: DataType.SimpleString, value: "Hello, World!" },
      state: { input: state.input, index: 16 },
    };
    expect(parseWithState(state)).toEqual(expected);
  });

  it("should parse bulk string correctly", () => {
    const state: ParseState = {
      input: Buffer.from("$5\r\nHello\r\n"),
      index: 0,
    };
    const expected: ParseResult = {
      data: { type: DataType.BulkString, value: "Hello" },
      state: { input: state.input, index: 11 },
    };
    expect(parseWithState(state)).toEqual(expected);
  });

  it("should parse empty bulk string correctly", () => {
    const state: ParseState = { input: Buffer.from("$0\r\n\r\n"), index: 0 };
    const expected: ParseResult = {
      data: { type: DataType.BulkString, value: "" },
      state: { input: state.input, index: 6 },
    };
    expect(parseWithState(state)).toEqual(expected);
  });

  it("should parse empty array correctly", () => {
    const state: ParseState = { input: Buffer.from("*0\r\n"), index: 0 };
    const expected: ParseResult = {
      data: { type: DataType.Array, value: [] },
      state: { input: state.input, index: 4 },
    };
    expect(parseWithState(state)).toEqual(expected);
  });

  it("should parse array with single element correctly", () => {
    const state: ParseState = {
      input: Buffer.from("*1\r\n:123\r\n"),
      index: 0,
    };
    const expected: ParseResult = {
      data: {
        type: DataType.Array,
        value: [{ type: DataType.Number, value: 123 }],
      },
      state: { input: state.input, index: 10 },
    };
    expect(parseWithState(state)).toEqual(expected);
  });

  it("should parse array with multiple elements correctly", () => {
    const state: ParseState = {
      input: Buffer.from("*3\r\n:123\r\n+Hello\r\n$5\r\nWorld\r\n"),
      index: 0,
    };
    const expected: ParseResult = {
      data: {
        type: DataType.Array,
        value: [
          { type: DataType.Number, value: 123 },
          { type: DataType.SimpleString, value: "Hello" },
          { type: DataType.BulkString, value: "World" },
        ],
      },
      state: { input: state.input, index: 29 },
    };
    expect(parseWithState(state)).toEqual(expected);
  });

  it("should parse nested arrays correctly", () => {
    const state: ParseState = {
      input: Buffer.from("*2\r\n*1\r\n:123\r\n+Hello\r\n"),
      index: 0,
    };
    const expected: ParseResult = {
      data: {
        type: DataType.Array,
        value: [
          {
            type: DataType.Array,
            value: [{ type: DataType.Number, value: 123 }],
          },
          { type: DataType.SimpleString, value: "Hello" },
        ],
      },
      state: { input: state.input, index: 22 },
    };
    expect(parseWithState(state)).toEqual(expected);
  });

  it("should return null for invalid input", () => {
    const state: ParseState = { input: Buffer.from("invalid"), index: 0 };
    expect(parseWithState(state)).toBeUndefined();
  });

  it("should return null for invalid number", () => {
    const state: ParseState = { input: Buffer.from(":abc\r\n"), index: 0 };
    expect(parseWithState(state)).toBeUndefined();
  });

  it("should return null for invalid bulk string length", () => {
    const state: ParseState = {
      input: Buffer.from("$-1\r\nHello\r\n"),
      index: 0,
    };
    expect(parseWithState(state)).toBeUndefined();
  });

  it("should return null for bulk string with incorrect length", () => {
    const state: ParseState = {
      input: Buffer.from("$5\r\nHello World\r\n"),
      index: 0,
    };
    expect(parseWithState(state)).toBeUndefined();
  });

  it("should return null for invalid array length", () => {
    const state: ParseState = { input: Buffer.from("*-1\r\n"), index: 0 };
    expect(parseWithState(state)).toBeUndefined();
  });

  it("should return null for array with invalid elements", () => {
    const state: ParseState = {
      input: Buffer.from("*1\r\n:abc\r\n"),
      index: 0,
    };
    expect(parseWithState(state)).toBeUndefined();
  });

  it("should parse multiple elements from a single buffer", () => {
    const state: ParseState = {
      input: Buffer.from(":123\r\n+Hello\r\n$5\r\nWorld\r\n"),
      index: 0,
    };

    const result1 = parseWithState(state);
    expect(result1).toEqual({
      data: { type: DataType.Number, value: 123 },
      state: { input: state.input, index: 6 },
    });

    const result2 = parseWithState(result1!.state);
    expect(result2).toEqual({
      data: { type: DataType.SimpleString, value: "Hello" },
      state: { input: state.input, index: 14 },
    });

    const result3 = parseWithState(result2!.state);
    expect(result3).toEqual({
      data: { type: DataType.BulkString, value: "World" },
      state: { input: state.input, index: 25 },
    });
  });
});
