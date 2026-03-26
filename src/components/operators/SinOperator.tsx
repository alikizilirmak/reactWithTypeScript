import type { OperatorButtonProps } from './types'

export function SinOperatorButton({ onSelect, activeOperator }: OperatorButtonProps) {
  return (
    <button
      type="button"
      className={`operator-button ${activeOperator === 'sin' ? 'active' : ''}`}
      onClick={() => onSelect('sin')}
    >
      sin
    </button>
  )
}
