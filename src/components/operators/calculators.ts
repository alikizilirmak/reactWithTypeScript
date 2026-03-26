import type { OperationCalculator } from './types'

export const calculateAddition: OperationCalculator = (first, second) => ({
  resultText: (first + second).toString(),
  isError: false,
})

export const calculateSubtraction: OperationCalculator = (first, second) => ({
  resultText: (first - second).toString(),
  isError: false,
})

export const calculateMultiplication: OperationCalculator = (first, second) => ({
  resultText: (first * second).toString(),
  isError: false,
})

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

export const calculatePower: OperationCalculator = (first, second) => ({
  resultText: (first ** second).toString(),
  isError: false,
})

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

export const calculateLog: OperationCalculator = (first, second) => {
  if (first <= 0) {
    return {
      resultText: 'Logaritmada sayı 0 veya negatif olamaz.',
      isError: true,
    }
  }

  if (second <= 0 || second === 1) {
    return {
      resultText: 'Logaritmada taban > 0 ve 1\'den farklı olmalı.',
      isError: true,
    }
  }

  return {
    resultText: (Math.log(first) / Math.log(second)).toString(),
    isError: false,
  }
}

export const calculateLn: OperationCalculator = (first) => {
  if (first <= 0) {
    return {
      resultText: 'ln için sayı 0 veya negatif olamaz.',
      isError: true,
    }
  }

  return {
    resultText: Math.log(first).toString(),
    isError: false,
  }
}

export const calculateExp: OperationCalculator = (first) => {
  const calculation = Math.exp(first)
  if (!Number.isFinite(calculation)) {
    return {
      resultText: 'e^x sonucu sayı sınırını aşıyor.',
      isError: true,
    }
  }

  return {
    resultText: calculation.toString(),
    isError: false,
  }
}

export const calculateSquare: OperationCalculator = (first) => ({
  resultText: (first ** 2).toString(),
  isError: false,
})

export const calculateReciprocal: OperationCalculator = (first) => {
  if (first === 0) {
    return {
      resultText: '0 sayısının tersi tanımsızdır.',
      isError: true,
    }
  }

  return {
    resultText: (1 / first).toString(),
    isError: false,
  }
}

export const calculateAbsolute: OperationCalculator = (first) => ({
  resultText: Math.abs(first).toString(),
  isError: false,
})

export const calculateFactorial: OperationCalculator = (first) => {
  if (!Number.isInteger(first) || first < 0) {
    return {
      resultText: 'Faktöriyel sadece 0 veya pozitif tam sayılar için tanımlıdır.',
      isError: true,
    }
  }

  if (first > 170) {
    return {
      resultText: 'Bu sayı için faktöriyel çok büyük (maksimum 170!).',
      isError: true,
    }
  }

  let result = 1
  for (let index = 2; index <= first; index += 1) {
    result *= index
  }

  return {
    resultText: result.toString(),
    isError: false,
  }
}

export const calculateMod: OperationCalculator = (first, second) => {
  if (second === 0) {
    return {
      resultText: 'mod işleminde bölen 0 olamaz.',
      isError: true,
    }
  }

  return {
    resultText: (first % second).toString(),
    isError: false,
  }
}

export const calculatePercent: OperationCalculator = (first, second) => ({
  resultText: ((first * second) / 100).toString(),
  isError: false,
})

export const calculatePermille: OperationCalculator = (first, second) => ({
  resultText: ((first * second) / 1000).toString(),
  isError: false,
})

export const calculateSin: OperationCalculator = (first) => ({
  resultText: Math.sin(first).toString(),
  isError: false,
})

export const calculateCos: OperationCalculator = (first) => ({
  resultText: Math.cos(first).toString(),
  isError: false,
})

export const calculateTan: OperationCalculator = (first) => {
  const cosValue = Math.cos(first)
  if (Math.abs(cosValue) < 1e-15) {
    return {
      resultText: 'tan bu açı için tanımsızdır (cos ≈ 0).',
      isError: true,
    }
  }

  return {
    resultText: Math.tan(first).toString(),
    isError: false,
  }
}
