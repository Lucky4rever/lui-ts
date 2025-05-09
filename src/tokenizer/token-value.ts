import { Identifier } from "../consts/identifiers";
import { Keyword } from "../consts/keywords";
import { OtherToken } from "../consts/other-tokens";
import { TokenProperty } from "../consts/token-property";
import { ValueType } from "../consts/value-types";

export type TokenValue = 
  | {
    key: 'KEYWORD';
    value: Keyword;
  }
  | {
    key: 'PROPERTY';
    value: TokenProperty;
  }
  | {
    key: 'VALUE_TYPE';
    value: ValueType;
  }
  | {
    key: 'VALUE';
    value: string | number;
  }
  | {
    key: 'IDENTIFIER';
    value: Identifier;
  }
  | {
    key: 'VARIABLE';
    value: string;
  }
  | {
    key: 'VARIABLE_REF';
    ref: string;
    type?: ValueType;
  }
  | {
    key: 'COMMENT';
    type: 'PRIVATE' | 'PUBLIC';
    value: string;
  }
  | {
    key: 'LAYER';
    name: string;
    action: 'START' | 'END';
  }
  | {
    key: OtherToken;
  }
  | {
    key: 'UNKNOWN';
  };
