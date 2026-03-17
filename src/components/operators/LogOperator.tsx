import type { OperationCalculator, OperatorButtonProps } from './types'

// "log" operatör butonu (iki sayı ile çalışır: log tabanı ikinci sayıdır).
export function LogOperatorButton({
  onSelect,
  activeOperator,
}: OperatorButtonProps) {
  return (
    <button
      type="button"
      className={`operator-button ${activeOperator === 'log' ? 'active' : ''}`}
      onClick={() => onSelect('log')}
    >
      log
    </button>
  )
}

// log tabanlı hesap: log_base(second)(first)
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
