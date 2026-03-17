import { calculateAddition } from './AdditionOperator'
import { calculateDivision } from './DivisionOperator'
import { calculateMultiplication } from './MultiplicationOperator'
import { OperatorOptions } from './OperatorOptions'
import { calculatePercent } from './PercentOperator'
import { calculatePermille } from './PermilleOperator'
import { calculatePower } from './PowerOperator'
import { calculateRoot } from './RootOperator'
import { calculateSubtraction } from './SubtractionOperator'
import type { OperationCalculator, Operator } from './types'

export { OperatorOptions }
export type { OperationCalculator, Operator } from './types'

export const operatorCalculators: Record<Operator, OperationCalculator> = {
  '+': calculateAddition,
  '-': calculateSubtraction,
  '*': calculateMultiplication,
  '/': calculateDivision,
  '^': calculatePower,
  '√': calculateRoot,
  '%': calculatePercent,
  '‰': calculatePermille,
}

export const isDegreeOperator = (operator: Operator): boolean =>
  operator === '^' || operator === '√'

export const isRatioOperator = (operator: Operator): boolean =>
  operator === '%' || operator === '‰'
