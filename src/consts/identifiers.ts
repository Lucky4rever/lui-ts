import { PROPERTIES_SET } from "./token-property";

const IDENTIFIER_INPUTS = [...Array.from(PROPERTIES_SET), "-all", "-base"] as const;

type ExtractAfterFirstDash<T extends string> =
  T extends `${string}-${infer Rest}`
    ? Rest
    : never;

type ProcessedArray<T extends readonly string[]> = {
  [K in keyof T]: ExtractAfterFirstDash<T[K]>;
}[number] extends infer U 
  ? U extends never 
    ? readonly [] 
    : (U extends string ? U : never)
  : never;

export type Identifier = ProcessedArray<typeof IDENTIFIER_INPUTS>;

function createIdentifierSet<T extends readonly string[]>(arr: T): Set<ExtractAfterFirstDash<T[number]>> {
  const set = new Set<string>();
  for (const item of arr) {
    const afterDash = item.split("-").slice(1).join("-");
    if (afterDash) {
      set.add(afterDash);
    }
  }
  return set as Set<ExtractAfterFirstDash<T[number]>>;
}

export const IDENTIFIERS_SET = createIdentifierSet(IDENTIFIER_INPUTS);
