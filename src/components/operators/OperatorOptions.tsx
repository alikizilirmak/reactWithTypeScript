import { AbsoluteOperatorButton } from './AbsoluteOperator'
import { AdditionOperatorButton } from './AdditionOperator'
import { CosOperatorButton } from './CosOperator'
import { DivisionOperatorButton } from './DivisionOperator'
import { ExpOperatorButton } from './ExpOperator'
import { FactorialOperatorButton } from './FactorialOperator'
import { LnOperatorButton } from './LnOperator'
import { LogOperatorButton } from './LogOperator'
import { ModOperatorButton } from './ModOperator'
import { MultiplicationOperatorButton } from './MultiplicationOperator'
import { PercentOperatorButton } from './PercentOperator'
import { PermilleOperatorButton } from './PermilleOperator'
import { PowerOperatorButton } from './PowerOperator'
import { ReciprocalOperatorButton } from './ReciprocalOperator'
import { RootOperatorButton } from './RootOperator'
import { SinOperatorButton } from './SinOperator'
import { SquareOperatorButton } from './SquareOperator'
import { SubtractionOperatorButton } from './SubtractionOperator'
import { TanOperatorButton } from './TanOperator'
import type { OperatorButtonProps } from './types'

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

export function ScientificOperatorButtons({
  onSelect,
  activeOperator,
}: OperatorButtonProps) {
  return (
    <>
      <PowerOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
      <RootOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
      <LogOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
      <LnOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
      <ExpOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
      <SquareOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
      <ReciprocalOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
      <AbsoluteOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
      <FactorialOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
      <ModOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
      <PercentOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
      <PermilleOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
      <SinOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
      <CosOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
      <TanOperatorButton onSelect={onSelect} activeOperator={activeOperator} />
    </>
  )
}

export function OperatorButtons({ onSelect, activeOperator }: OperatorButtonProps) {
  return (
    <>
      {/* Eski tek-parça düzen için tüm operatörleri birlikte döndürür. */}
      <BasicOperatorButtons onSelect={onSelect} activeOperator={activeOperator} />
      <ScientificOperatorButtons onSelect={onSelect} activeOperator={activeOperator} />
    </>
  )
}
