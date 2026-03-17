import type { OperationCalculator } from './types'

// Select için bölme operatörü seçeneği.
export function DivisionOperatorOption() {
  return <option value="/">/</option>
}

export const calculateDivision: OperationCalculator = (first, second) => {
  // Bölmede 0'a bölme hatası üretmemiz gerekiyor.
  // Hata metnini burada üretip App'e "isError: true" ile bildiriyoruz.
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
