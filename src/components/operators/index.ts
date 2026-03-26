import {
  calculateAbsolute,
  calculateAddition,
  calculateCos,
  calculateDivision,
  calculateExp,
  calculateFactorial,
  calculateLn,
  calculateLog,
  calculateMod,
  calculateMultiplication,
  calculatePercent,
  calculatePermille,
  calculatePower,
  calculateReciprocal,
  calculateRoot,
  calculateSin,
  calculateSquare,
  calculateSubtraction,
  calculateTan,
} from './calculators'
import {
  BasicOperatorButtons,
  OperatorButtons,
  ScientificOperatorButtons,
} from './OperatorOptions'
import type { OperationCalculator, Operator } from './types'

export { BasicOperatorButtons, OperatorButtons, ScientificOperatorButtons }
export type { OperationCalculator, Operator, OperatorButtonProps } from './types'

export const operatorCalculators: Record<Operator, OperationCalculator> = {
  '+': calculateAddition,
  '-': calculateSubtraction,
  '*': calculateMultiplication,
  '/': calculateDivision,
  log: calculateLog,
  ln: calculateLn,
  'e^x': calculateExp,
  'x²': calculateSquare,
  '1/x': calculateReciprocal,
  '|x|': calculateAbsolute,
  'x!': calculateFactorial,
  mod: calculateMod,
  '^': calculatePower,
  '√': calculateRoot,
  '%': calculatePercent,
  '‰': calculatePermille,
  sin: calculateSin,
  cos: calculateCos,
  tan: calculateTan,
}

export const isDegreeOperator = (operator: Operator): boolean =>
  operator === '^' || operator === '√'

export const isRatioOperator = (operator: Operator): boolean =>
  operator === '%' || operator === '‰'
