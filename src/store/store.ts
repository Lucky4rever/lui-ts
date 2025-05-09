import { ValueType } from "../consts/value-types";

export type VariableValue = {
  value: string | number;
  type: ValueType | undefined;
};

export class Store {
  private variables: Record<string, VariableValue> = {};

  /**
   * Додає змінну до сховища
   * @param identifier Назва змінної
   * @param value Значення змінної (число або рядок)
   * @param type Тип значення (наприклад, "px", "%")
   */
  addVariable(identifier: string, value: string | number, type?: ValueType) {
    this.variables[identifier] = { value, type };
  }

  /**
   * Оновлює існуючу змінну
   * @param identifier Назва змінної
   * @param newValue Нове значення
   * @param newType Новий тип (опціонально)
   */
  updateVariable(identifier: string, newValue: string | number, newType?: ValueType) {
    if (this.variables[identifier]) {
      this.variables[identifier] = { 
        value: newValue,
        type: newType ?? this.variables[identifier].type
      };
    }
  }

  /**
   * Повертає всі змінні
   */
  getVariables(): Record<string, VariableValue> {
    return { ...this.variables }; // Повертаємо копію об'єкта
  }

  /**
   * Повертає конкретну змінну
   * @param name Назва змінної
   */
  getVariable(name: string): VariableValue | undefined {
    return this.variables[name];
  }

  /**
   * Видаляє змінну
   * @param name Назва змінної
   */
  removeVariable(name: string): boolean {
    if (this.variables[name]) {
      delete this.variables[name];
      return true;
    }
    return false;
  }

  /**
   * Очищає всі змінні
   */
  clearVariables(): void {
    this.variables = {};
  }
}

export default new Store();

// import { TokenValue, Keyword, ValueType } from "./tokenizer/tokens";

// export type VariableValue = {
//   value: string | number;
//   type: ValueType | undefined;
// };

// type TypedValue =
//   | {
//     key: 'VALUE';
//     value: string | number;
//   }
//   | {
//     key: 'VALUE_TYPE';
//     value: string;
//   };

// export class Store {
//   private variables: Record<string, VariableValue> = {};

//   store(tokens: TokenValue[]) {
//     for (let i = 0; i < tokens.length; i++) {
//       if (tokens[i].key !== 'KEYWORD') continue;

//       const keywordToken = tokens[i] as { key: 'KEYWORD'; value: Keyword };

//       if (keywordToken.value !== 'VAR') continue;

//       const identifier = tokens[i + 1];
//       const equals = tokens[i + 2];
//       const value = tokens[i + 3] as TypedValue;
//       const possibleType = tokens[i + 4];
//       let type: TypedValue | undefined = undefined;

//       if (possibleType?.key === 'VALUE_TYPE') {
//         type = possibleType;
//       }

//       if (
//         identifier?.key === 'VARIABLE' &&
//         equals?.key === 'EQUALS' &&
//         (value?.key === 'VALUE' || value?.key === 'VALUE_TYPE')
//       ) {
//         this.variables[identifier.value] = {
//           value: value.value,
//           type: type?.value as ValueType | null ?? undefined,
//         };
//       }
//     }
//   }

//   getVariables() {
//     return this.variables;
//   }

//   getVariable(name: string) {
//     return this.variables[name];
//   }
// }

// export default new Store();