import { Property } from "../consts/token-property";

type SpecialProperty = "COMMENT" | "LAYER";

export type ProcessedValue = {
  property: Property | SpecialProperty;
  values: string[];
  optionalName?: string;
  pseudoClass?: string;
  media?: string;
};
