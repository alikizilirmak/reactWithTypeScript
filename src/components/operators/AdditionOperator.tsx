import type { OperationCalculator, OperatorButtonProps } from './types'

// React'te "props", parent component'ten gelen verilerdir.
// Bu component "+" butonunu çizer ve tıklanınca parent'a hangi operatör seçildiğini bildirir.
export function AdditionOperatorButton({
  onSelect,
  activeOperator,
}: OperatorButtonProps) {
  return (
    <button
      type="button"
      className={`operator-button ${activeOperator === '+' ? 'active' : ''}`}
      onClick={() => onSelect('+')}
    >
      +
    </button>
  )
}

// Toplama işleminin hesaplama mantığı bu dosyada tutulur.
export const calculateAddition: OperationCalculator = (first, second) => ({
  resultText: (first + second).toString(),
  isError: false,
})
