import type { OperationCalculator } from './types'

export function RootOperatorOption() {
  return <option value="√">n√x</option>
}

export const calculateRoot: OperationCalculator = (first, second) => {
  if (second === 0) {
    return {
      resultText: 'Kök derecesi 0 olamaz.',
      isError: true,
    }
  }

  if (first < 0) {
    if (!Number.isInteger(second)) {
      return {
        resultText: 'Negatif sayıda derece tam sayı olmalı.',
        isError: true,
      }
    }

    if (Math.abs(second) % 2 === 0) {
      return {
        resultText: 'Negatif sayının çift dereceden kökü yoktur.',
        isError: true,
      }
    }

    const rootValue = Math.pow(Math.abs(first), 1 / Math.abs(second))
    const calculation = second > 0 ? -rootValue : -1 / rootValue

    return {
      resultText: calculation.toString(),
      isError: false,
    }
  }

  return {
    resultText: Math.pow(first, 1 / second).toString(),
    isError: false,
  }
}
