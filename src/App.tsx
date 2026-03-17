import { useMemo, useState } from 'react'
import './App.css'

type Operator = '+' | '-' | '*' | '/'

function App() {
  const [firstValue, setFirstValue] = useState<string>('')
  const [secondValue, setSecondValue] = useState<string>('')
  const [operator, setOperator] = useState<Operator>('+')
  const [result, setResult] = useState<string>('0')

  const parsedValues = useMemo(
    () => ({
      first: Number(firstValue),
      second: Number(secondValue),
    }),
    [firstValue, secondValue],
  )

  const calculate = () => {
    const { first, second } = parsedValues

    if (Number.isNaN(first) || Number.isNaN(second)) {
      setResult('Lütfen geçerli bir sayı girin.')
      return
    }

    if (operator === '/' && second === 0) {
      setResult('0 ile bölme yapılamaz.')
      return
    }

    let calculation = 0

    switch (operator) {
      case '+':
        calculation = first + second
        break
      case '-':
        calculation = first - second
        break
      case '*':
        calculation = first * second
        break
      case '/':
        calculation = first / second
        break
      default:
        calculation = 0
    }

    setResult(calculation.toString())
  }

  return (
    <main className="calculator">
      <h1>Mini Hesap Makinesi</h1>
      <p>Toplama, çıkarma, çarpma ve bölme</p>

      <div className="inputs">
        <input
          type="number"
          placeholder="1. sayı"
          value={firstValue}
          onChange={(event) => setFirstValue(event.target.value)}
        />
        <select
          aria-label="İşlem seç"
          value={operator}
          onChange={(event) => setOperator(event.target.value as Operator)}
        >
          <option value="+">+</option>
          <option value="-">-</option>
          <option value="*">*</option>
          <option value="/">/</option>
        </select>
        <input
          type="number"
          placeholder="2. sayı"
          value={secondValue}
          onChange={(event) => setSecondValue(event.target.value)}
        />
      </div>

      <button type="button" onClick={calculate}>
        Hesapla
      </button>

      <div className="result">
        <span>Sonuç:</span> {result}
      </div>
    </main>
  )
}

export default App
