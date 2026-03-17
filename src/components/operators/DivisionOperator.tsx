import type { OperationCalculator, OperatorButtonProps } from './types'

// "/" operatör butonu.
export function DivisionOperatorButton({
  onSelect,
  activeOperator,
}: OperatorButtonProps) {
  return (
    <button
      type="button"
      className={`operator-button ${activeOperator === '/' ? 'active' : ''}`}
      onClick={() => onSelect('/')}
    >
      /
    </button>
  )
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
