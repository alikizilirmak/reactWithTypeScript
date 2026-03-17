import { AdditionOperatorOption } from './AdditionOperator'
import { DivisionOperatorOption } from './DivisionOperator'
import { MultiplicationOperatorOption } from './MultiplicationOperator'
import { PercentOperatorOption } from './PercentOperator'
import { PermilleOperatorOption } from './PermilleOperator'
import { PowerOperatorOption } from './PowerOperator'
import { RootOperatorOption } from './RootOperator'
import { SubtractionOperatorOption } from './SubtractionOperator'

export function OperatorOptions() {
  return (
    <>
      {/* Select içindeki option'ları ayrı operatör componentlerinden topluyoruz. */}
      {/* Böylece bir operatörü eklemek/silmek tek dosya değişikliğiyle yapılır. */}
      <AdditionOperatorOption />
      <SubtractionOperatorOption />
      <MultiplicationOperatorOption />
      <DivisionOperatorOption />
      <PowerOperatorOption />
      <RootOperatorOption />
      <PercentOperatorOption />
      <PermilleOperatorOption />
    </>
  )
}
