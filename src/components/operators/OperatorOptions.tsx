import { AdditionOperatorButton } from './AdditionOperator'
import { DivisionOperatorButton } from './DivisionOperator'
import { MultiplicationOperatorButton } from './MultiplicationOperator'
import { PercentOperatorButton } from './PercentOperator'
import { PermilleOperatorButton } from './PermilleOperator'
import { PowerOperatorButton } from './PowerOperator'
import { RootOperatorButton } from './RootOperator'
import { SubtractionOperatorButton } from './SubtractionOperator'
import type { OperatorButtonProps } from './types'

// Temel 4 işlem butonları (+ - * /)
export function BasicOperatorButtons({
  onSelect,
  activeOperator,
}: OperatorButtonProps) {
  return (
    <>
      <AdditionOperatorButton
        onSelect={onSelect}
        activeOperator={activeOperator}
      />
      <SubtractionOperatorButton
        onSelect={onSelect}
        activeOperator={activeOperator}
      />
      <MultiplicationOperatorButton
        onSelect={onSelect}
        activeOperator={activeOperator}
      />
      <DivisionOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
    </>
  )
}

// Gelişmiş operatör butonları (^ √ % ‰)
export function AdvancedOperatorButtons({
  onSelect,
  activeOperator,
}: OperatorButtonProps) {
  return (
    <>
      <PowerOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
      <RootOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
      <PercentOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
      <PermilleOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
    </>
  )
}
