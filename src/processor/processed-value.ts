import { Property } from "../consts/properties";

type SpecialProperty = "COMMENT";

export type ProcessedValue = {
  property: Property | SpecialProperty;
  values: string[];
};
