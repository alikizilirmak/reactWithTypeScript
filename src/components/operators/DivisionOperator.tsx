import type { OperationCalculator } from './types'

export function DivisionOperatorOption() {
  return <option value="/">/</option>
}

export const calculateDivision: OperationCalculator = (first, second) => {
  if (second === 0) {
    return {
      resultText: '0 ile bölme yapılamaz.',
      isError: true,
    }
  }

  return {
    resultText: (first / second).toString(),
    isError: false,
  }
}
