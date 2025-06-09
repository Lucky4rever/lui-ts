import { ValueType } from "../consts/value-types";

export type VariableValue = {
  values: (string | number)[];
  types: (ValueType | undefined)[];
};

export class Store {
  private variables: Record<string, VariableValue> = {};

  addVariable(identifier: string, values: (string | number)[], types?: (ValueType | undefined)[]) {
    this.variables[identifier] = { 
      values: [...values],
      types: types ? [...types] : Array(values.length).fill(undefined)
    };
  }

  updateVariable(identifier: string, newValues: (string | number)[], newTypes?: (ValueType | undefined)[]) {
    if (this.variables[identifier]) {
      this.variables[identifier] = { 
        values: [...newValues],
        types: newTypes ? [...newTypes] : Array(newValues.length).fill(undefined)
      };
    }
  }

  getVariables(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [name, variable] of Object.entries(this.variables)) {
      result[name] = this.joinVariableValues(variable);
    }
    return result;
  }

  getVariable(name: string): string | undefined {
    const variable = this.variables[name];
    if (!variable) return undefined;
    return this.joinVariableValues(variable);
  }

  private joinVariableValues(variable: VariableValue): string {
    return variable.values
      .map((value, i) => `${value}${variable.types[i] || ''}`)
      .join(' ');
  }

  removeVariable(name: string): boolean {
    if (this.variables[name]) {
      delete this.variables[name];
      return true;
    }
    return false;
  }

  clearVariables(): void {
    this.variables = {};
  }
}

export default new Store();