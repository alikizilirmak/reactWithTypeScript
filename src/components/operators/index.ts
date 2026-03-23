import { calculateAbsolute } from './AbsoluteOperator'
import { calculateAddition } from './AdditionOperator'
import { calculateDivision } from './DivisionOperator'
import { calculateExp } from './ExpOperator'
import { calculateFactorial } from './FactorialOperator'
import { calculateLn } from './LnOperator'
import { calculateLog } from './LogOperator'
import { calculateMod } from './ModOperator'
import { calculateMultiplication } from './MultiplicationOperator'
import {
  BasicOperatorButtons,
  OperatorButtons,
  ScientificOperatorButtons,
} from './OperatorOptions'
import { calculatePercent } from './PercentOperator'
import { calculatePermille } from './PermilleOperator'
import { calculatePower } from './PowerOperator'
import { calculateReciprocal } from './ReciprocalOperator'
import { calculateRoot } from './RootOperator'
import { calculateSquare } from './SquareOperator'
import { calculateSubtraction } from './SubtractionOperator'
import type { OperationCalculator, Operator } from './types'

// App.tsx bu dosyadan tek import ile tüm operatör altyapısını alabilsin diye
// "barrel file" (toplayıcı dosya) yaklaşımı kullanıyoruz.
export { BasicOperatorButtons, OperatorButtons, ScientificOperatorButtons }
export type { OperationCalculator, Operator, OperatorButtonProps } from './types'

// Operatör -> hesaplayıcı eşlemesi.
// App tarafında switch-case yazmak yerine bu kayıt tablosunu kullanıyoruz.
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
}

// Bazı UI davranışlarını (placeholder/hint) operatör grubuna göre değiştirmek için
// küçük yardımcı fonksiyonlar kullanıyoruz.
export const isDegreeOperator = (operator: Operator): boolean =>
  operator === '^' || operator === '√'

export const isRatioOperator = (operator: Operator): boolean =>
  operator === '%' || operator === '‰'
