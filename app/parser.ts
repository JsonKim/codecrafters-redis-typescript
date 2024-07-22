// parser.ts
import { O, pipe } from "@mobily/ts-belt";
import { Buffer } from "buffer";

export const DataType = {
  Number: 0x3a, // ':'
  SimpleString: 0x2b, // '+'
  BulkString: 0x24, // '$'
  Array: 0x2a, // '*'
} as const;

type DataTypeValues = (typeof DataType)[keyof typeof DataType];

export type NumberData = {
  type: typeof DataType.Number;
  value: number;
};

export type SimpleStringData = {
  type: typeof DataType.SimpleString;
  value: string;
};

export type BulkStringData = {
  type: typeof DataType.BulkString;
  value: string;
};

export type ArrayData = {
  type: typeof DataType.Array;
  value: Data[];
};

export type Data = NumberData | SimpleStringData | BulkStringData | ArrayData;

export type ParseState = {
  input: Buffer;
  index: number;
};

export type ParseResult<T extends Data = Data> = O.Option<{
  data: T;
  state: ParseState;
}>;

const CRLF = Buffer.from([0x0d, 0x0a]); // \r\n

function hasPrefix(state: ParseState, prefix: DataTypeValues): boolean {
  return state.input[state.index] === prefix;
}

function findDelimiter(state: ParseState, delimiter: Buffer): number {
  for (
    let i = state.index;
    i < state.input.length - delimiter.length + 1;
    i++
  ) {
    if (state.input.slice(i, i + delimiter.length).equals(delimiter)) {
      return i;
    }
  }
  return -1;
}

function readUntilDelimiter(
  state: ParseState,
  delimiter: Buffer
): { value: string; newState: ParseState } | null {
  const endIndex = findDelimiter(state, delimiter);
  if (endIndex === -1) {
    return null;
  }

  const value = state.input.toString("utf8", state.index, endIndex);
  const newState = { ...state, index: endIndex + delimiter.length };

  return { value, newState };
}

function parsePrefix<T extends Data>(
  state: ParseState,
  prefix: DataTypeValues,
  parser: (value: string) => Omit<T, "type"> | null
): ParseResult<T> {
  if (!hasPrefix(state, prefix)) {
    return O.None;
  }

  const result = readUntilDelimiter({ ...state, index: state.index + 1 }, CRLF);
  if (result === null) {
    return O.None;
  }

  const parsedValue = parser(result.value);
  if (parsedValue === null) {
    return O.None;
  }

  return {
    data: {
      type: prefix,
      ...parsedValue,
    } as T,
    state: result.newState,
  };
}

const parseNumber = (state: ParseState) =>
  parsePrefix<NumberData>(state, DataType.Number, (str) => {
    const num = Number(str);
    return isNaN(num) ? null : { value: num };
  });

const parseSimpleString = (state: ParseState) =>
  parsePrefix<SimpleStringData>(state, DataType.SimpleString, (str) => ({
    value: str,
  }));

const parseBulkString = (state: ParseState) => {
  const lengthResult = parsePrefix<NumberData>(
    state,
    DataType.BulkString,
    (str) => {
      const num = Number(str);
      return isNaN(num) || num < 0 ? null : { value: num };
    }
  );

  if (O.isNone(lengthResult)) {
    return O.None;
  }

  const {
    data: { value: length },
    state: lengthState,
  } = lengthResult;

  if (lengthState.index + length + CRLF.length > lengthState.input.length) {
    return O.None;
  }

  const content = lengthState.input.toString(
    "utf8",
    lengthState.index,
    lengthState.index + length
  );
  // CRLF 종료 확인
  const endIndex = lengthState.index + length;
  if (!lengthState.input.slice(endIndex, endIndex + CRLF.length).equals(CRLF)) {
    return O.None;
  }
  const finalState = {
    ...lengthState,
    index: lengthState.index + length + CRLF.length,
  };

  return {
    data: {
      type: DataType.BulkString,
      value: content,
    },
    state: finalState,
  };
};

const parseArray = (state: ParseState) => {
  const lengthResult = parsePrefix<NumberData>(state, DataType.Array, (str) => {
    const num = Number(str);
    return isNaN(num) || num < 0 ? null : { value: num };
  });

  if (O.isNone(lengthResult)) {
    return O.None;
  }

  const {
    data: { value: length },
    state: lengthState,
  } = lengthResult;
  let currentState = lengthState;
  const elements: Data[] = [];

  for (let i = 0; i < length; i++) {
    const result = parseWithState(currentState);
    if (O.isNone(result)) {
      return O.None;
    }
    elements.push(result.data);
    currentState = result.state;
  }

  return {
    data: {
      type: DataType.Array,
      value: elements,
    },
    state: currentState,
  };
};

export function parseWithState(state: ParseState): ParseResult<Data> {
  switch (state.input[state.index]) {
    case DataType.Number:
      return parseNumber(state);
    case DataType.SimpleString:
      return parseSimpleString(state);
    case DataType.BulkString:
      return parseBulkString(state);
    case DataType.Array:
      return parseArray(state);
    default:
      return O.None;
  }
}

export const parse = (input: Buffer) =>
  pipe(
    { input, index: 0 },
    parseWithState,
    O.map((r) => r.data)
  );
