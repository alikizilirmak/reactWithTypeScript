import type { OperatorButtonProps } from './types'

export function ReciprocalOperatorButton({
  onSelect,
  activeOperator,
}: OperatorButtonProps) {
  return (
    <button
      type="button"
      className={`operator-button ${activeOperator === '1/x' ? 'active' : ''}`}
      onClick={() => onSelect('1/x')}
    >
      1/x
    </button>
  )
}
