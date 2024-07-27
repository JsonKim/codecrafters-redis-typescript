import { O } from "@mobily/ts-belt";

type Value = {
  data: string;
  createAt: number;
  px: O.Option<number>;
};

export const makeValue = (
  data: string,
  createAt: number,
  px: O.Option<number> = O.None
): Value => ({
  data,
  createAt,
  px,
});

const database = new Map<string, Value>();

export const getByKey = (key: string) => database.get(key);

export const setByKey = (key: string, value: Value): void => {
  database.set(key, value);
};
