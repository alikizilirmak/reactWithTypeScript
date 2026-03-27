import { useEffect, useRef, useState } from 'react'
import './App.css'
import { CalculationComponent } from './components/calculation/CalculationComponent'
import {
  BasicOperatorButtons,
  isDegreeOperator,
  isRatioOperator,
  ScientificOperatorButtons,
  type Operator,
} from './components/operators'

// TypeScript'teki "type" anahtar kelimesi ile veri şekillerini tanımlarız.
// Burada geçmiş listesindeki her satırın hangi alanlara sahip olacağını sabitliyoruz.
type HistoryItem = {
  firstValue: string
  secondValue: string
  operator: Operator | 'expr'
  result: string
  expression: string
  isError: boolean
  createdAt: number
}

const HISTORY_STORAGE_KEY = 'calculator-history-v2'
const THEME_STORAGE_KEY = 'calculator-theme-v1'
const MAX_HISTORY_ITEMS = 10
const LEGACY_HISTORY_STORAGE_KEYS = ['calculator-history-v1', 'calculator-history'] as const
const VALID_OPERATORS: ReadonlySet<Operator> = new Set([
  '+',
  '-',
  '*',
  '/',
  '^',
  '√',
  '%',
  '‰',
  'log',
  'ln',
  'e^x',
  'x²',
  '1/x',
  '|x|',
  'x!',
  'mod',
])
const VALID_HISTORY_OPERATORS: ReadonlySet<HistoryItem['operator']> = new Set([
  ...VALID_OPERATORS,
  'expr',
])
const UNARY_OPERATORS: ReadonlySet<Operator> = new Set([
  'ln',
  'e^x',
  'x²',
  '1/x',
  '|x|',
  'x!',
])
type ThemeMode = 'light' | 'dark'

// localStorage'dan okuduğumuz veriyi güvenli kullanmak için basit type guard.
const isHistoryItem = (value: unknown): value is HistoryItem => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const maybeItem = value as Partial<HistoryItem>

  return (
    typeof maybeItem.firstValue === 'string' &&
    typeof maybeItem.secondValue === 'string' &&
    typeof maybeItem.operator === 'string' &&
    VALID_HISTORY_OPERATORS.has(maybeItem.operator as HistoryItem['operator']) &&
    typeof maybeItem.result === 'string' &&
    typeof maybeItem.expression === 'string' &&
    typeof maybeItem.isError === 'boolean' &&
    typeof maybeItem.createdAt === 'number' &&
    Number.isFinite(maybeItem.createdAt)
  )
}

// Eski sürüm history kayıtları için (isError alanı olmayan satırlar gibi)
// toleranslı normalize fonksiyonu. Uyumlu formatı yeni shape'e çeviriyoruz.
const normalizeHistoryItem = (value: unknown): HistoryItem | null => {
  if (isHistoryItem(value)) {
    return value
  }

  if (!value || typeof value !== 'object') {
    return null
  }

  const maybeItem = value as Partial<HistoryItem>
  if (
    typeof maybeItem.firstValue !== 'string' ||
    typeof maybeItem.secondValue !== 'string' ||
    typeof maybeItem.operator !== 'string' ||
    !VALID_HISTORY_OPERATORS.has(maybeItem.operator as HistoryItem['operator']) ||
    typeof maybeItem.result !== 'string' ||
    typeof maybeItem.expression !== 'string'
  ) {
    return null
  }

  return {
    firstValue: maybeItem.firstValue,
    secondValue: maybeItem.secondValue,
    operator: maybeItem.operator as HistoryItem['operator'],
    result: maybeItem.result,
    expression: maybeItem.expression,
    // Eski kayıtlarda yoksa başarılı işlem kabul ediyoruz.
    isError: typeof maybeItem.isError === 'boolean' ? maybeItem.isError : false,
    createdAt:
      typeof maybeItem.createdAt === 'number' && Number.isFinite(maybeItem.createdAt)
        ? maybeItem.createdAt
        : Date.now(),
  }
}

const isUnaryOperator = (operator: Operator): boolean => UNARY_OPERATORS.has(operator)

const readThemeFromStorage = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'light'
  }

  try {
    const rawValue = window.localStorage.getItem(THEME_STORAGE_KEY)
    return rawValue === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

type ExpressionEvaluationResult = {
  resultText: string
  isError: boolean
}

type PolynomialSolveResult = {
  resultText: string
  isError: boolean
}

type PolynomialCoefficientsParseResult =
  | {
      isError: false
      coefficients: number[]
      degree: number
      normalizedExpression: string
      polynomialText: string
    }
  | {
      isError: true
      errorText: string
    }

type PolynomialParseOptions = {
  allowSingleSidedExpression?: boolean
  maxDegree?: number
}

type EquationGraphPoint = {
  x: number
  y: number
}

type EquationGraphData = {
  expression: string
  polynomialText: string
  points: EquationGraphPoint[]
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

const formatCompactNumber = (value: number): string =>
  Number.parseFloat(value.toPrecision(12)).toString()

const formatPolynomialFromCoefficients = (
  coefficients: number[],
  degree: number,
  variableSymbol = 'a',
): string => {
  const terms: string[] = []
  const epsilon = 1e-10

  const addTerm = (coefficient: number, power: number) => {
    if (Math.abs(coefficient) < epsilon) {
      return
    }

    const absCoefficient = Math.abs(coefficient)
    const suffix = power === 0 ? '' : power === 1 ? variableSymbol : `${variableSymbol}^${power}`
    const hasSuffix = power > 0
    const coefficientText =
      hasSuffix && Math.abs(absCoefficient - 1) < epsilon ? '' : formatCompactNumber(absCoefficient)
    const termText = `${coefficientText}${suffix}`

    if (terms.length === 0) {
      terms.push(coefficient < 0 ? `-${termText}` : termText)
      return
    }

    terms.push(`${coefficient < 0 ? '-' : '+'} ${termText}`)
  }

  for (let index = 0; index < coefficients.length; index += 1) {
    const power = degree - index
    addTerm(coefficients[index] ?? 0, power)
  }

  return terms.length > 0 ? terms.join(' ') : '0'
}

const SUPERSCRIPT_TO_DIGIT_MAP: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
}

const normalizeExpressionForPolynomial = (rawExpression: string, variableSymbol: string): string => {
  const normalizedVariable = variableSymbol.toLowerCase()
  return rawExpression
    .replaceAll(',', '.')
    .replace(/\s+/g, '')
    .replaceAll(normalizedVariable.toUpperCase(), normalizedVariable)
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (match) => {
      const digits = [...match].map((char) => SUPERSCRIPT_TO_DIGIT_MAP[char] ?? '')
      return `^${digits.join('')}`
    })
}

const evaluatePolynomialValue = (coefficients: number[], value: number): number =>
  coefficients.reduce((accumulator, coefficient) => accumulator * value + coefficient, 0)

const parsePolynomialCoefficients = (
  rawExpression: string,
  variableSymbol = 'a',
  options: PolynomialParseOptions = {},
): PolynomialCoefficientsParseResult => {
  const { allowSingleSidedExpression = false, maxDegree = 12 } = options
  const normalizedExpression = normalizeExpressionForPolynomial(rawExpression, variableSymbol)

  if (!normalizedExpression) {
    return {
      isError: true,
      errorText: `Lütfen ${variableSymbol} içeren bir denklem girin.`,
    }
  }

  const expressionParts = normalizedExpression.split('=')
  const epsilon = 1e-10

  const parseSide = (sideExpression: string): Map<number, number> | null => {
    if (sideExpression === '') {
      return null
    }

    const withLeadingSign = /^[+-]/.test(sideExpression) ? sideExpression : `+${sideExpression}`
    const terms = withLeadingSign.match(/[+-][^+-]+/g) ?? []
    if (terms.length === 0) {
      return null
    }

    const coefficientsByPower = new Map<number, number>()
    const escapedVariable = variableSymbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const variableTermPattern = new RegExp(
      `^([+-])(?:(\\d+(?:\\.\\d*)?|\\.\\d+)\\*?)?${escapedVariable}(?:\\^(\\d+))?$`,
    )
    const constantPattern = /^([+-])(\d+(?:\.\d*)?|\.\d+)$/

    for (const term of terms) {
      if (term.includes(variableSymbol)) {
        const match = term.match(variableTermPattern)
        if (!match) {
          return null
        }

        const sign = match[1] === '-' ? -1 : 1
        const rawCoefficient = match[2]
        const rawPower = match[3]
        const coefficientMagnitude =
          rawCoefficient === undefined || rawCoefficient === '' ? 1 : Number(rawCoefficient)
        const parsedPower = rawPower === undefined ? 1 : Number(rawPower)

        if (
          !Number.isFinite(coefficientMagnitude) ||
          !Number.isInteger(parsedPower) ||
          parsedPower < 0 ||
          parsedPower > maxDegree
        ) {
          return null
        }

        const parsedCoefficient = sign * coefficientMagnitude
        const previousCoefficient = coefficientsByPower.get(parsedPower) ?? 0
        coefficientsByPower.set(parsedPower, previousCoefficient + parsedCoefficient)
        continue
      }

      const constantMatch = term.match(constantPattern)
      if (!constantMatch) {
        return null
      }

      const sign = constantMatch[1] === '-' ? -1 : 1
      const parsedConstant = Number(constantMatch[2])
      if (!Number.isFinite(parsedConstant)) {
        return null
      }
      const previousConstant = coefficientsByPower.get(0) ?? 0
      coefficientsByPower.set(0, previousConstant + sign * parsedConstant)
    }

    return coefficientsByPower
  }

  const toResult = (coefficientsByPower: Map<number, number>): PolynomialCoefficientsParseResult => {
    const normalizedEntries = [...coefficientsByPower.entries()]
      .map(([power, coefficient]) => [power, Math.abs(coefficient) < epsilon ? 0 : coefficient] as const)
      .filter(([, coefficient]) => coefficient !== 0)

    if (normalizedEntries.length === 0) {
      return {
        isError: false,
        coefficients: [0],
        degree: 0,
        normalizedExpression,
        polynomialText: '0',
      }
    }

    const maxPower = Math.max(...normalizedEntries.map(([power]) => power))
    if (!Number.isFinite(maxPower) || maxPower > maxDegree) {
      return {
        isError: true,
        errorText: `Maksimum ${maxDegree}. dereceye kadar destekleniyor.`,
      }
    }

    const coefficients = Array.from({ length: maxPower + 1 }, () => 0)
    for (const [power, coefficient] of normalizedEntries) {
      coefficients[maxPower - power] = coefficient
    }

    while (coefficients.length > 1 && Math.abs(coefficients[0] ?? 0) < epsilon) {
      coefficients.shift()
    }

    const degree = coefficients.length - 1
    return {
      isError: false,
      coefficients,
      degree,
      normalizedExpression,
      polynomialText: formatPolynomialFromCoefficients(coefficients, degree, variableSymbol),
    }
  }

  if (expressionParts.length === 1 && allowSingleSidedExpression) {
    const singleSideMap = parseSide(expressionParts[0] ?? '')
    if (!singleSideMap) {
      return {
        isError: true,
        errorText: `Fonksiyon formatı geçersiz. Örn: 2${variableSymbol}^3-5${variableSymbol}+1`,
      }
    }

    return toResult(singleSideMap)
  }

  if (expressionParts.length !== 2) {
    return {
      isError: true,
      errorText: 'Denklem bir adet "=" içermelidir.',
    }
  }

  const [leftSide, rightSide] = expressionParts
  if (leftSide === '' || rightSide === '') {
    return {
      isError: true,
      errorText: 'Eşitliğin her iki tarafında da ifade olmalıdır.',
    }
  }

  const leftCoefficients = parseSide(leftSide)
  const rightCoefficients = parseSide(rightSide)
  if (!leftCoefficients || !rightCoefficients) {
    return {
      isError: true,
      errorText: `Denklem formatı geçersiz. Örn: 2${variableSymbol}^3-5${variableSymbol}=7`,
    }
  }

  const resultMap = new Map<number, number>(leftCoefficients)
  for (const [power, coefficient] of rightCoefficients.entries()) {
    resultMap.set(power, (resultMap.get(power) ?? 0) - coefficient)
  }
  return toResult(resultMap)
}

const buildPolynomialGraphData = (rawExpression: string, variableSymbol = 'a') => {
  const parseResult = parsePolynomialCoefficients(rawExpression, variableSymbol, {
    allowSingleSidedExpression: true,
    maxDegree: 12,
  })
  if (parseResult.isError) {
    return parseResult
  }

  const { coefficients, normalizedExpression, polynomialText } = parseResult
  const xMin = -10
  const xMax = 10
  const sampleCount = 401
  const points: EquationGraphPoint[] = []

  for (let index = 0; index < sampleCount; index += 1) {
    const ratio = index / (sampleCount - 1)
    const x = xMin + (xMax - xMin) * ratio
    const y = evaluatePolynomialValue(coefficients, x)

    if (!Number.isFinite(y)) {
      continue
    }

    points.push({ x, y })
  }

  if (points.length < 2) {
    return {
      isError: true as const,
      errorText: 'Grafik çizilemedi. Denklem değerlerini kontrol edin.',
    }
  }

  const yValues = points.map((point) => point.y)
  const rawYMin = Math.min(...yValues)
  const rawYMax = Math.max(...yValues)
  const hasFlatRange = Math.abs(rawYMax - rawYMin) < 1e-10
  const fallbackRange = hasFlatRange
    ? { min: rawYMin - 1, max: rawYMax + 1 }
    : { min: rawYMin, max: rawYMax }
  const yPadding = (fallbackRange.max - fallbackRange.min) * 0.1

  return {
    isError: false as const,
    data: {
      expression: normalizedExpression,
      polynomialText,
      points,
      xMin,
      xMax,
      yMin: fallbackRange.min - yPadding,
      yMax: fallbackRange.max + yPadding,
    },
  }
}

type ComplexNumber = {
  re: number
  im: number
}

const addComplex = (left: ComplexNumber, right: ComplexNumber): ComplexNumber => ({
  re: left.re + right.re,
  im: left.im + right.im,
})

const subtractComplex = (left: ComplexNumber, right: ComplexNumber): ComplexNumber => ({
  re: left.re - right.re,
  im: left.im - right.im,
})

const multiplyComplex = (left: ComplexNumber, right: ComplexNumber): ComplexNumber => ({
  re: left.re * right.re - left.im * right.im,
  im: left.re * right.im + left.im * right.re,
})

const divideComplex = (left: ComplexNumber, right: ComplexNumber): ComplexNumber | null => {
  const denominator = right.re ** 2 + right.im ** 2
  if (denominator < 1e-16) {
    return null
  }

  return {
    re: (left.re * right.re + left.im * right.im) / denominator,
    im: (left.im * right.re - left.re * right.im) / denominator,
  }
}

const complexAbs = (value: ComplexNumber): number => Math.hypot(value.re, value.im)

const evaluatePolynomialComplex = (
  coefficients: number[],
  value: ComplexNumber,
): ComplexNumber => {
  let accumulator: ComplexNumber = {
    re: coefficients[0] ?? 0,
    im: 0,
  }

  for (let index = 1; index < coefficients.length; index += 1) {
    accumulator = addComplex(multiplyComplex(accumulator, value), {
      re: coefficients[index] ?? 0,
      im: 0,
    })
  }

  return accumulator
}

const findRealPolynomialRoots = (coefficients: number[]): number[] | null => {
  const degree = coefficients.length - 1
  if (degree < 1) {
    return []
  }

  const leadingCoefficient = coefficients[0]
  if (leadingCoefficient === undefined || Math.abs(leadingCoefficient) < 1e-12) {
    return null
  }

  const normalizedCoefficients = coefficients.map((coefficient) => coefficient / leadingCoefficient)
  const radius =
    1 + Math.max(...normalizedCoefficients.slice(1).map((coefficient) => Math.abs(coefficient)))
  let roots: ComplexNumber[] = Array.from({ length: degree }, (_, index) => {
    const angle = (2 * Math.PI * index) / degree
    return {
      re: radius * Math.cos(angle),
      im: radius * Math.sin(angle),
    }
  })

  const maxIterations = 250
  const convergenceThreshold = 1e-9

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    let isConverged = true
    const nextRoots: ComplexNumber[] = []

    for (let index = 0; index < degree; index += 1) {
      const root = roots[index] ?? { re: 0, im: 0 }
      let denominator: ComplexNumber = { re: 1, im: 0 }

      for (let innerIndex = 0; innerIndex < degree; innerIndex += 1) {
        if (innerIndex === index) {
          continue
        }

        const otherRoot = roots[innerIndex] ?? { re: 0, im: 0 }
        let difference = subtractComplex(root, otherRoot)
        if (complexAbs(difference) < 1e-12) {
          difference = {
            re: difference.re + 1e-6,
            im: difference.im + 1e-6,
          }
        }
        denominator = multiplyComplex(denominator, difference)
      }

      const numerator = evaluatePolynomialComplex(normalizedCoefficients, root)
      const delta = divideComplex(numerator, denominator)
      if (!delta) {
        nextRoots.push(root)
        isConverged = false
        continue
      }

      const nextRoot = subtractComplex(root, delta)
      if (complexAbs(delta) > convergenceThreshold) {
        isConverged = false
      }
      nextRoots.push(nextRoot)
    }

    roots = nextRoots
    if (isConverged) {
      break
    }
  }

  const derivativeCoefficients = coefficients
    .slice(0, -1)
    .map((coefficient, index) => coefficient * (degree - index))

  const polishedRealRoots = roots
    .filter((root) => Math.abs(root.im) < 1e-6)
    .map((root) => {
      let current = root.re
      for (let iteration = 0; iteration < 12; iteration += 1) {
        const value = evaluatePolynomialValue(coefficients, current)
        const derivativeValue = evaluatePolynomialValue(derivativeCoefficients, current)
        if (!Number.isFinite(value) || !Number.isFinite(derivativeValue) || Math.abs(derivativeValue) < 1e-10) {
          break
        }

        const next = current - value / derivativeValue
        if (!Number.isFinite(next)) {
          break
        }

        if (Math.abs(next - current) < 1e-10) {
          current = next
          break
        }
        current = next
      }
      return current
    })
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right)

  const uniqueRoots: number[] = []
  for (const root of polishedRealRoots) {
    const previousRoot = uniqueRoots[uniqueRoots.length - 1]
    if (previousRoot === undefined || Math.abs(root - previousRoot) > 1e-5) {
      uniqueRoots.push(root)
      continue
    }

    uniqueRoots[uniqueRoots.length - 1] = (previousRoot + root) / 2
  }

  const coefficientScale = Math.max(...coefficients.map((coefficient) => Math.abs(coefficient)), 1)
  const verifiedRoots = uniqueRoots.filter(
    (root) => Math.abs(evaluatePolynomialValue(coefficients, root)) <= coefficientScale * 1e-5,
  )
  return verifiedRoots
}

const SUBSCRIPT_DIGITS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉']

const toSubscriptNumber = (value: number): string =>
  value
    .toString()
    .split('')
    .map((digit) => SUBSCRIPT_DIGITS[Number(digit)] ?? digit)
    .join('')

const evaluateParenthesizedExpression = (rawExpression: string): ExpressionEvaluationResult => {
  const expression = rawExpression.replaceAll(',', '.').replace(/\s+/g, '')
  if (!expression) {
    return {
      resultText: 'Lütfen bir ifade girin.',
      isError: true,
    }
  }

  const tokens: string[] = []
  for (let index = 0; index < expression.length; ) {
    const currentChar = expression[index]

    if (/\d|\./.test(currentChar)) {
      let cursor = index
      let dotCount = 0

      while (cursor < expression.length && /[\d.]/.test(expression[cursor])) {
        if (expression[cursor] === '.') {
          dotCount += 1
          if (dotCount > 1) {
            return {
              resultText: 'İfadede geçersiz sayı formatı var.',
              isError: true,
            }
          }
        }
        cursor += 1
      }

      const numberToken = expression.slice(index, cursor)
      if (numberToken === '.') {
        return {
          resultText: 'Tek başına nokta sayı olamaz.',
          isError: true,
        }
      }

      tokens.push(numberToken)
      index = cursor
      continue
    }

    if ('+-*/^()'.includes(currentChar)) {
      tokens.push(currentChar)
      index += 1
      continue
    }

    return {
      resultText: `Geçersiz karakter: "${currentChar}"`,
      isError: true,
    }
  }

  // Örtük çarpımı destekliyoruz: 5(2), (2)(3), (2)3 gibi.
  // Böylece kullanıcı "*" yazmadan da matematiksel ifade girebilir.
  const tokensWithImplicitMultiplication: string[] = []
  for (const token of tokens) {
    const previousToken = tokensWithImplicitMultiplication[tokensWithImplicitMultiplication.length - 1]
    const previousTokenIsValue =
      previousToken !== undefined &&
      (!Number.isNaN(Number(previousToken)) || previousToken === ')')
    const tokenStartsValue = token === '(' || !Number.isNaN(Number(token))

    if (previousTokenIsValue && tokenStartsValue) {
      tokensWithImplicitMultiplication.push('*')
    }

    tokensWithImplicitMultiplication.push(token)
  }

  const normalizedTokens: string[] = []
  for (const token of tokensWithImplicitMultiplication) {
    const previousToken = normalizedTokens[normalizedTokens.length - 1]
    const canBeUnary = !previousToken || ['+', '-', '*', '/', '^', '(', 'u+', 'u-'].includes(previousToken)

    if ((token === '+' || token === '-') && canBeUnary) {
      normalizedTokens.push(token === '+' ? 'u+' : 'u-')
      continue
    }

    normalizedTokens.push(token)
  }

  const precedence: Record<string, number> = {
    'u+': 4,
    'u-': 4,
    '^': 3,
    '*': 2,
    '/': 2,
    '+': 1,
    '-': 1,
  }
  const isRightAssociative = (operator: string): boolean =>
    operator === '^' || operator === 'u+' || operator === 'u-'
  const isOperatorToken = (token: string): boolean => token in precedence

  const outputQueue: string[] = []
  const operatorStack: string[] = []

  for (const token of normalizedTokens) {
    if (!Number.isNaN(Number(token))) {
      outputQueue.push(token)
      continue
    }

    if (isOperatorToken(token)) {
      while (operatorStack.length > 0) {
        const topOperator = operatorStack[operatorStack.length - 1]
        if (!isOperatorToken(topOperator)) {
          break
        }

        const shouldPop = isRightAssociative(token)
          ? precedence[token] < precedence[topOperator]
          : precedence[token] <= precedence[topOperator]

        if (!shouldPop) {
          break
        }

        outputQueue.push(operatorStack.pop() as string)
      }

      operatorStack.push(token)
      continue
    }

    if (token === '(') {
      operatorStack.push(token)
      continue
    }

    if (token === ')') {
      let foundOpeningParenthesis = false
      while (operatorStack.length > 0) {
        const topOperator = operatorStack.pop() as string
        if (topOperator === '(') {
          foundOpeningParenthesis = true
          break
        }
        outputQueue.push(topOperator)
      }

      if (!foundOpeningParenthesis) {
        return {
          resultText: 'Parantezler eşleşmiyor.',
          isError: true,
        }
      }
      continue
    }

    return {
      resultText: 'İfade çözümlenemedi.',
      isError: true,
    }
  }

  while (operatorStack.length > 0) {
    const topOperator = operatorStack.pop() as string
    if (topOperator === '(' || topOperator === ')') {
      return {
        resultText: 'Parantezler eşleşmiyor.',
        isError: true,
      }
    }
    outputQueue.push(topOperator)
  }

  const calculationStack: number[] = []
  for (const token of outputQueue) {
    if (!Number.isNaN(Number(token))) {
      calculationStack.push(Number(token))
      continue
    }

    if (token === 'u+' || token === 'u-') {
      const operand = calculationStack.pop()
      if (operand === undefined) {
        return {
          resultText: 'İfadede eksik değer var.',
          isError: true,
        }
      }
      calculationStack.push(token === 'u-' ? -operand : operand)
      continue
    }

    const rightOperand = calculationStack.pop()
    const leftOperand = calculationStack.pop()
    if (rightOperand === undefined || leftOperand === undefined) {
      return {
        resultText: 'İfadede eksik operatör veya değer var.',
        isError: true,
      }
    }

    if (token === '/' && rightOperand === 0) {
      return {
        resultText: 'İfadede 0 ile bölme yapılamaz.',
        isError: true,
      }
    }

    const operationResult =
      token === '+'
        ? leftOperand + rightOperand
        : token === '-'
          ? leftOperand - rightOperand
          : token === '*'
            ? leftOperand * rightOperand
            : token === '/'
              ? leftOperand / rightOperand
              : leftOperand ** rightOperand

    if (!Number.isFinite(operationResult)) {
      return {
        resultText: 'İfade sonucu sayı sınırını aşıyor.',
        isError: true,
      }
    }

    calculationStack.push(operationResult)
  }

  if (calculationStack.length !== 1) {
    return {
      resultText: 'İfade tamamlanamadı, lütfen parantez ve operatörleri kontrol edin.',
      isError: true,
    }
  }

  return {
    resultText: calculationStack[0].toString(),
    isError: false,
  }
}

const evaluatePolynomialEquation = (
  rawExpression: string,
  variableSymbol = 'a',
): PolynomialSolveResult => {
  const parseResult = parsePolynomialCoefficients(rawExpression, variableSymbol, {
    allowSingleSidedExpression: true,
    maxDegree: 12,
  })
  if (parseResult.isError) {
    return {
      resultText: parseResult.errorText,
      isError: true,
    }
  }

  const { coefficients, degree } = parseResult
  const epsilon = 1e-10
  const isAlmostZero = (value: number): boolean => Math.abs(value) <= epsilon

  if (degree === 0) {
    const constantTerm = coefficients[0] ?? 0
    if (isAlmostZero(constantTerm)) {
      return {
        resultText: 'Sonsuz çözüm var (özdeş denklem).',
        isError: false,
      }
    }

    return {
      resultText: 'Çözümsüz denklem.',
      isError: true,
    }
  }

  if (degree === 1) {
    const coefficientA = coefficients[0] ?? 0
    const coefficientB = coefficients[1] ?? 0
    if (isAlmostZero(coefficientA)) {
      if (isAlmostZero(coefficientB)) {
        return {
          resultText: 'Sonsuz çözüm var (özdeş denklem).',
          isError: false,
        }
      }

      return {
        resultText: 'Çözümsüz denklem.',
        isError: true,
      }
    }

    const linearRoot = -coefficientB / coefficientA
    if (!Number.isFinite(linearRoot)) {
      return {
        resultText: 'Denklem sonucu sayı sınırını aşıyor.',
        isError: true,
      }
    }

    return {
      resultText: `${variableSymbol} = ${formatCompactNumber(linearRoot)}`,
      isError: false,
    }
  }

  const realRoots = findRealPolynomialRoots(coefficients)
  if (realRoots === null) {
    return {
      resultText: 'Denklem çözülemedi. Lütfen ifadeyi kontrol edin.',
      isError: true,
    }
  }

  if (realRoots.length === 0) {
    return {
      resultText: 'Gerçek sayılarda kök yok.',
      isError: true,
    }
  }

  if (realRoots.length === 1) {
    return {
      resultText: `${variableSymbol} = ${formatCompactNumber(realRoots[0] ?? 0)}`,
      isError: false,
    }
  }

  return {
    resultText: realRoots
      .map(
        (root, index) =>
          `${variableSymbol}${toSubscriptNumber(index + 1)} = ${formatCompactNumber(root)}`,
      )
      .join(', '),
    isError: false,
  }
}

// localStorage okuma işini tek yerde topluyoruz.
// Not: Burada veritabanı yok; geçmiş sadece kullanıcının tarayıcısında saklanır.
// Bu yüzden uygulamayı kapatıp açınca (aynı tarayıcı/origin'de) history geri gelir.
// useState'in başlangıç değerinde bunu kullanınca StrictMode'da ilk render yazımıyla
// verinin boş diziye ezilmesi riskini de ortadan kaldırmış oluruz.
const readHistoryFromStorage = (): HistoryItem[] => {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const candidateKeys = [HISTORY_STORAGE_KEY, ...LEGACY_HISTORY_STORAGE_KEYS]
    for (const key of candidateKeys) {
      const rawValue = window.localStorage.getItem(key)
      if (!rawValue) {
        continue
      }

      const parsedValue: unknown = JSON.parse(rawValue)
      if (!Array.isArray(parsedValue)) {
        continue
      }

      const normalizedHistory = parsedValue
        .map(normalizeHistoryItem)
        .filter((item): item is HistoryItem => item !== null)
        .slice(0, MAX_HISTORY_ITEMS)

      if (normalizedHistory.length > 0) {
        return normalizedHistory
      }
    }
  } catch {
    // localStorage verisi bozuksa boş geçmiş ile devam ederiz.
  }

  return []
}

// Hesaplama isteğini bir job olarak tutuyoruz.
// Bu sayede hesaplamayı App dışındaki bir component tetikleyebiliyor.
type CalculationJob = {
  id: number
  first: number
  second: number
  operator: Operator
  source: 'equal' | 'chain' | 'unary'
  nextOperator?: Operator
}

type HistoryFilter = 'all' | 'success' | 'error' | 'expression'

function App() {
  // React'teki "useState" bir Hook'tur.
  // Hook: component içinde veriyi (state) saklamamızı sağlar.
  const [displayValue, setDisplayValue] = useState<string>('0')
  const [lastPressedValue, setLastPressedValue] = useState<string>('')
  const [storedValue, setStoredValue] = useState<number | null>(null)
  const [memoryValue, setMemoryValue] = useState<number | null>(null)
  const [pendingOperator, setPendingOperator] = useState<Operator | null>(null)
  const [calculationJob, setCalculationJob] = useState<CalculationJob | null>(null)
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readThemeFromStorage())
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all')
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState<boolean>(false)
  const [isEquationGraphOpen, setIsEquationGraphOpen] = useState<boolean>(false)
  const [equationGraphInput, setEquationGraphInput] = useState<string>('')
  const [equationGraphData, setEquationGraphData] = useState<EquationGraphData | null>(null)
  const [equationGraphError, setEquationGraphError] = useState<string>('')
  const [equationSolveResult, setEquationSolveResult] = useState<string>('')
  const [isEquationSolveError, setIsEquationSolveError] = useState<boolean>(false)
  const [isWaitingForSecondValue, setIsWaitingForSecondValue] =
    useState<boolean>(false)
  const [isExpressionInputActive, setIsExpressionInputActive] = useState<boolean>(false)
  const [activeVirtualKey, setActiveVirtualKey] = useState<string | null>(null)
  const calculationSequenceRef = useRef<number>(0)
  const handledJobIdsRef = useRef<Set<number>>(new Set())
  const keyFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const keyboardContextRef = useRef<{
    appendDecimal: () => void
    appendDigit: (digit: string) => void
    appendExpressionToken: (token: string) => void
    backspaceDisplay: () => void
    clearAll: () => void
    flashVirtualKey: (key: string) => void
    handleEqual: () => void
    handleOperatorSelect: (operator: Operator) => void
    displayValue: string
    isExpressionInputActive: boolean
    isShortcutHelpOpen: boolean
  } | null>(null)

  // Kullanıcının yaptığı son işlemleri burada tutuyoruz.
  // En güncel işlem en üstte olacak.
  const [history, setHistory] = useState<HistoryItem[]>(() => readHistoryFromStorage())

  // History değiştikçe localStorage'a yazarak kalıcı hale getiriyoruz.
  // Sayfa yenileme veya uygulamayı yeniden başlatma sonrası aynı veriyi tekrar okuyabiliriz.
  useEffect(() => {
    try {
      window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
    } catch {
      // Tarayıcı depolama hatası olsa da uygulama çalışmaya devam etsin.
    }
  }, [history])

  // Tema seçimini localStorage'da saklayıp sayfa yenilemelerinde koruyoruz.
  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeMode)
    } catch {
      // Depolama hatasında tema değişimi yine de UI'da çalışmaya devam etsin.
    }
  }, [themeMode])

  // Tema class'ını body üzerinde tutuyoruz ki arka plan dahil tüm sayfaya etki etsin.
  useEffect(() => {
    document.body.setAttribute('data-theme', themeMode)
    return () => document.body.removeAttribute('data-theme')
  }, [themeMode])

  // "null" değeri burada "henüz geçerli bir sayı yok" anlamında kullanılıyor.
  // Regex + Number kontrolü ile güvenli parse yapıyoruz.
  const parseNumberInput = (rawValue: string): number | null => {
    const trimmedValue = rawValue.trim()
    const isValidNumber = /^-?(?:\d+\.?\d*|\.\d+)$/.test(trimmedValue)

    if (!isValidNumber) {
      return null
    }

    const parsedValue = Number(trimmedValue)
    return Number.isFinite(parsedValue) ? parsedValue : null
  }

  // Hesap makinesinde kullanacağımız sayıları "ekran dostu" kısa formata çevirir.
  // Böylece pi/e gibi değerler gereksiz uzun görünmez.
  const formatNumberForDisplay = (value: number): string => {
    const normalizedValue = Number.parseFloat(value.toPrecision(12))
    return Number.isFinite(normalizedValue) ? normalizedValue.toString() : value.toString()
  }

  // Pi ve e gibi hazır sayıları ekrana yerleştirmek için ortak yardımcı.
  const applyPreparedNumber = (value: number, pressedLabel: string) => {
    const formattedValue = formatNumberForDisplay(value)

    if (isExpressionInputActive) {
      appendExpressionToken(formattedValue)
      setLastPressedValue(pressedLabel)
      return
    }

    setDisplayValue(formattedValue)
    setLastPressedValue(pressedLabel)
    setStoredValue(null)
    setPendingOperator(null)
    setCalculationJob(null)
    setIsWaitingForSecondValue(false)
    setIsExpressionInputActive(false)
  }

  // Geçmişte görünürken boş değerleri daha anlaşılır göstermek için yardımcı fonksiyon.
  const toDisplayValue = (rawValue: string): string => {
    const trimmedValue = rawValue.trim()
    return trimmedValue === '' ? 'boş' : trimmedValue
  }

  // Bu fonksiyon geçmişte gözüken işlem metnini üretir.
  // Farklı operatörlerde daha anlaşılır ifade formatı seçiyoruz.
  const buildExpression = (
    first: string,
    selectedOperator: Operator,
    second: string,
    resultText: string,
  ): string => {
    if (selectedOperator === 'ln') {
      return `ln(${first}) = ${resultText}`
    }

    if (selectedOperator === 'e^x') {
      return `e^(${first}) = ${resultText}`
    }

    if (selectedOperator === 'x²') {
      return `(${first})² = ${resultText}`
    }

    if (selectedOperator === '1/x') {
      return `1 / (${first}) = ${resultText}`
    }

    if (selectedOperator === '|x|') {
      return `|${first}| = ${resultText}`
    }

    if (selectedOperator === 'x!') {
      return `${first}! = ${resultText}`
    }

    if (selectedOperator === 'log') {
      return `${second} tabanında log(${first}) = ${resultText}`
    }

    if (selectedOperator === '√') {
      return `${second}. dereceden kök(${first}) = ${resultText}`
    }

    if (selectedOperator === '%') {
      return `${first} sayısının %${second} değeri = ${resultText}`
    }

    if (selectedOperator === '‰') {
      return `${first} sayısının ‰${second} değeri = ${resultText}`
    }

    return `${first} ${selectedOperator} ${second} = ${resultText}`
  }

  // Geçmişe kayıt ekleme işi tek yerde dursun diye helper kullandık.
  // Bu yaklaşım kod tekrarını azaltır.
  const addToHistoryByValues = (
    first: string,
    second: string,
    selectedOperator: Operator,
    resultText: string,
    isError = false,
  ) => {
    const displayFirst = toDisplayValue(first)
    const displaySecond = toDisplayValue(second)

    const historyItem: HistoryItem = {
      firstValue: first,
      secondValue: second,
      operator: selectedOperator,
      result: resultText,
      isError,
      createdAt: Date.now(),
      expression: buildExpression(
        displayFirst,
        selectedOperator,
        displaySecond,
        resultText,
      ),
    }

    // Listeyi "en yeni en üstte" tutuyoruz.
    // Limit aşılırsa listenin sonundaki (en eski) kayıt otomatik düşer.
    const pushHistoryItem = (item: HistoryItem) =>
      setHistory((previousHistory) => {
        const nextHistory = [item, ...previousHistory]
        if (nextHistory.length > MAX_HISTORY_ITEMS) {
          nextHistory.length = MAX_HISTORY_ITEMS
        }

        return nextHistory
      })

    pushHistoryItem(historyItem)
  }

  const addExpressionToHistory = (
    expressionText: string,
    resultText: string,
    isError: boolean,
  ) => {
    const normalizedExpression = expressionText.trim()
    const historyItem: HistoryItem = {
      firstValue: normalizedExpression,
      secondValue: '',
      operator: 'expr',
      result: resultText,
      isError,
      createdAt: Date.now(),
      expression: `${normalizedExpression} = ${resultText}`,
    }

    setHistory((previousHistory) => {
      const nextHistory = [historyItem, ...previousHistory]
      if (nextHistory.length > MAX_HISTORY_ITEMS) {
        nextHistory.length = MAX_HISTORY_ITEMS
      }

      return nextHistory
    })
  }

  // Sayısal senaryolarda helper: number değerleri string'e çevirip history'e ekler.
  const addToHistory = (
    first: number,
    second: number,
    selectedOperator: Operator,
    resultText: string,
    isError = false,
  ) => {
    addToHistoryByValues(
      first.toString(),
      second.toString(),
      selectedOperator,
      resultText,
      isError,
    )
  }

  // Klavyeden bir tuşa basılınca ilgili butonu kısa süre "basılmış" gibi gösteriyoruz.
  const flashVirtualKey = (key: string) => {
    setActiveVirtualKey(key)

    if (keyFlashTimeoutRef.current) {
      clearTimeout(keyFlashTimeoutRef.current)
    }

    keyFlashTimeoutRef.current = setTimeout(() => {
      setActiveVirtualKey(null)
    }, 120)
  }

  // Hesaplama job'ı oluştururken benzersiz id veriyoruz.
  // useRef ile tuttuğumuz sayaç, render'lar arasında değerini korur.
  const queueCalculationJob = (job: Omit<CalculationJob, 'id'>) => {
    calculationSequenceRef.current += 1
    const nextId = calculationSequenceRef.current

    // Çok uzun kullanımda set'in sınırsız büyümemesi için ara sıra temizliyoruz.
    if (handledJobIdsRef.current.size > 200) {
      handledJobIdsRef.current.clear()
    }

    handledJobIdsRef.current.delete(nextId)
    setCalculationJob({
      id: nextId,
      ...job,
    })
  }

  // Hesaplama component'i sonucu döndüğünde bu fonksiyon çalışır.
  const handleCalculationResult = (
    finishedJob: CalculationJob,
    resultText: string,
    isError: boolean,
  ) => {
    // ResultText'i her durumda ekrana basıyoruz (hata mesajı da olabilir).
    setDisplayValue(resultText)
    addToHistory(
      finishedJob.first,
      finishedJob.second,
      finishedJob.operator,
      resultText,
      isError,
    )

    if (finishedJob.source === 'chain') {
      // "chain" = kullanıcı bir operatöre basarak yeni işlemi zincirli başlatıyor.
      // Örn: 5 + 2 + ... gibi.
      if (isError) {
        setStoredValue(null)
        setPendingOperator(null)
        setIsWaitingForSecondValue(true)
        setCalculationJob(null)
        return
      }

      const parsedResult = parseNumberInput(resultText)

      if (parsedResult === null) {
        setStoredValue(null)
        setPendingOperator(null)
        setIsWaitingForSecondValue(true)
        setCalculationJob(null)
        return
      }

      setStoredValue(parsedResult)
      setPendingOperator(finishedJob.nextOperator ?? null)
      setIsWaitingForSecondValue(true)
      setCalculationJob(null)
      return
    }

    // "equal" akışında iş tamamlandığı için bekleyen operatörü sıfırlıyoruz.
    setStoredValue(null)
    setPendingOperator(null)
    setIsWaitingForSecondValue(true)
    setIsExpressionInputActive(false)
    setCalculationJob(null)
  }

  // Parantezli ifade yazarken karakterleri doğrudan ekrana ekliyoruz.
  const appendExpressionToken = (token: string) => {
    const normalizedToken = token === ',' ? '.' : token
    const currentDisplay = displayValue.trim()
    const parsedCurrentValue = parseNumberInput(currentDisplay)
    const pendingOperatorToken =
      !isExpressionInputActive && pendingOperator !== null && isWaitingForSecondValue
        ? pendingOperator
        : ''
    const canReuseCurrentDisplay =
      isExpressionInputActive || pendingOperatorToken !== '' || (parsedCurrentValue !== null && currentDisplay !== '0')
    const baseValue = canReuseCurrentDisplay ? `${currentDisplay}${pendingOperatorToken}` : ''
    const needsImplicitMultiplication =
      normalizedToken === '(' && /[\d.)]$/.test(baseValue)
    const nextValue = `${baseValue}${needsImplicitMultiplication ? '*' : ''}${normalizedToken}`

    setDisplayValue(nextValue)
    setLastPressedValue(nextValue)
    setStoredValue(null)
    setPendingOperator(null)
    setCalculationJob(null)
    setIsWaitingForSecondValue(false)
    setIsExpressionInputActive(true)
  }

  const solvePolynomialEquationFromInput = (rawExpression: string, options?: { syncDisplay?: boolean }) => {
    const expressionText = rawExpression.trim()
    const { resultText, isError } = evaluatePolynomialEquation(expressionText, 'a')

    if (options?.syncDisplay !== false) {
      setDisplayValue(resultText)
      setLastPressedValue(expressionText)
      addExpressionToHistory(expressionText, resultText, isError)

      setStoredValue(null)
      setPendingOperator(null)
      setCalculationJob(null)
      setIsWaitingForSecondValue(true)
      setIsExpressionInputActive(false)
    }

    return { resultText, isError }
  }

  const drawEquationGraph = (expressionText: string) => {
    const graphResult = buildPolynomialGraphData(expressionText.trim(), 'a')

    if (graphResult.isError) {
      setEquationGraphData(null)
      setEquationGraphError(graphResult.errorText)
      return
    }

    setEquationGraphData(graphResult.data)
    setEquationGraphError('')
  }

  const openEquationGraphFromDisplay = () => {
    const expressionText = displayValue.trim()
    const initialInput = expressionText === '0' ? '' : expressionText

    setEquationGraphInput(initialInput)
    setEquationGraphData(null)
    setEquationGraphError('')
    setEquationSolveResult('')
    setIsEquationSolveError(false)
    setIsEquationGraphOpen(true)

    if (initialInput !== '') {
      drawEquationGraph(initialInput)
    }
  }

  const handleGraphInputSubmit = () => {
    drawEquationGraph(equationGraphInput)
  }

  const handleGraphSolveSubmit = () => {
    const expressionText = equationGraphInput.trim()
    if (expressionText === '') {
      setEquationGraphError('Lütfen çözülecek bir polinom denklem girin.')
      setEquationSolveResult('')
      setIsEquationSolveError(false)
      return
    }

    const { resultText, isError } = solvePolynomialEquationFromInput(expressionText, {
      syncDisplay: false,
    })

    if (isError) {
      setEquationGraphError(resultText)
      setEquationSolveResult(resultText)
      setIsEquationSolveError(true)
      return
    }

    setEquationGraphError('')
    setEquationSolveResult(resultText)
    setIsEquationSolveError(false)
    setDisplayValue(resultText)
    setLastPressedValue(expressionText)
    addExpressionToHistory(expressionText, resultText, false)
    setStoredValue(null)
    setPendingOperator(null)
    setCalculationJob(null)
    setIsWaitingForSecondValue(true)
    setIsExpressionInputActive(false)
  }

  // Rakam butonları için giriş fonksiyonu.
  // Eğer yeni ikinci sayı bekleniyorsa ekrandaki değeri sıfırdan başlatır.
  const appendDigit = (digit: string) => {
    if (isExpressionInputActive) {
      appendExpressionToken(digit)
      return
    }

    if (isWaitingForSecondValue || parseNumberInput(displayValue) === null) {
      setDisplayValue(digit)
      setLastPressedValue(digit)
      setIsWaitingForSecondValue(false)
      setIsExpressionInputActive(false)
      return
    }

    if (displayValue === '0') {
      setDisplayValue(digit)
      setLastPressedValue(digit)
      setIsExpressionInputActive(false)
      return
    }

    const nextValue = `${displayValue}${digit}`
    setDisplayValue(nextValue)
    setLastPressedValue(nextValue)
    setIsExpressionInputActive(false)
  }

  // Ondalık nokta ekleme işlemi.
  const appendDecimal = () => {
    if (isExpressionInputActive) {
      appendExpressionToken('.')
      return
    }

    if (isWaitingForSecondValue || parseNumberInput(displayValue) === null) {
      setDisplayValue('0.')
      setLastPressedValue('0.')
      setIsWaitingForSecondValue(false)
      setIsExpressionInputActive(false)
      return
    }

    if (!displayValue.includes('.')) {
      const nextValue = `${displayValue}.`
      setDisplayValue(nextValue)
      setLastPressedValue(nextValue)
      setIsExpressionInputActive(false)
    }
  }

  // Pozitif/negatif işaretini çevirir (±).
  const toggleSign = () => {
    if (isExpressionInputActive) {
      const expression = displayValue.trim()
      if (!expression || expression === '0') {
        return
      }

      const lastNumberMatch = expression.match(/-?\d+(?:\.\d+)?(?=[^\d.]*$)/)
      if (!lastNumberMatch || lastNumberMatch.index === undefined) {
        const endsWithOpeningGroup = /[(*+\-/^=]$/.test(expression)
        const fallbackValue = endsWithOpeningGroup ? `${expression}-` : `${expression}*(-1)`
        setDisplayValue(fallbackValue)
        setLastPressedValue(fallbackValue)
        return
      }

      const matchedNumber = lastNumberMatch[0]
      const matchStart = lastNumberMatch.index
      const matchEnd = matchStart + matchedNumber.length
      const toggledNumber = matchedNumber.startsWith('-')
        ? matchedNumber.slice(1)
        : `-${matchedNumber}`
      const nextValue = `${expression.slice(0, matchStart)}${toggledNumber}${expression.slice(matchEnd)}`

      setDisplayValue(nextValue)
      setLastPressedValue(nextValue)
      return
    }

    const parsedValue = parseNumberInput(displayValue)

    if (parsedValue === null || parsedValue === 0) {
      return
    }

    if (displayValue.startsWith('-')) {
      const nextValue = displayValue.slice(1)
      setDisplayValue(nextValue)
      setLastPressedValue(nextValue)
      return
    }

    const nextValue = `-${displayValue}`
    setDisplayValue(nextValue)
    setLastPressedValue(nextValue)
  }

  // Backspace davranışı: son girilen karakteri siler.
  const backspaceDisplay = () => {
    if (isExpressionInputActive) {
      if (displayValue.length <= 1) {
        setDisplayValue('0')
        setLastPressedValue('')
        setIsExpressionInputActive(false)
          return
      }

      const nextValue = displayValue.slice(0, -1)
      setDisplayValue(nextValue)
      setLastPressedValue(nextValue)

      if (!/[()+\-*/^=]/.test(nextValue)) {
        setIsExpressionInputActive(false)
        }
      return
    }

    if (isWaitingForSecondValue) {
      return
    }

    if (parseNumberInput(displayValue) === null) {
      setDisplayValue('0')
      return
    }

    if (displayValue.length <= 1) {
      setDisplayValue('0')
      return
    }

    const nextValue = displayValue.slice(0, -1)
    if (nextValue === '' || nextValue === '-') {
      setDisplayValue('0')
      return
    }

    setDisplayValue(nextValue)
    setLastPressedValue(nextValue)
    setIsExpressionInputActive(false)
  }

  // Operatör butonuna basıldığında çalışır.
  // İlk sayı saklanır, ikinci sayı için bekleme moduna geçilir.
  const handleOperatorSelect = (selectedOperator: Operator) => {
    if (isExpressionInputActive) {
      if (
        selectedOperator === '+' ||
        selectedOperator === '-' ||
        selectedOperator === '*' ||
        selectedOperator === '/' ||
        selectedOperator === '^'
      ) {
        appendExpressionToken(selectedOperator)
        return
      }

      setDisplayValue('Parantezli ifadede sadece +, -, *, / ve ^ kullanılabilir.')
      return
    }

    setLastPressedValue(selectedOperator)
    const currentValue = parseNumberInput(displayValue)

    if (currentValue === null) {
      setDisplayValue('Lütfen önce geçerli bir sayı girin.')
      return
    }

    // Tek operandlı operatörlerde (ln, x², 1/x, |x|, x!) ikinci sayı beklemiyoruz.
    if (isUnaryOperator(selectedOperator)) {
      setStoredValue(null)
      setPendingOperator(null)
      setIsWaitingForSecondValue(true)
      queueCalculationJob({
        first: currentValue,
        second: 0,
        operator: selectedOperator,
        source: 'unary',
      })
      return
    }

    if (storedValue === null) {
      setStoredValue(currentValue)
      setPendingOperator(selectedOperator)
      setIsWaitingForSecondValue(true)
      setIsExpressionInputActive(false)
      return
    }

    if (pendingOperator !== null && !isWaitingForSecondValue) {
      // Burada hesaplamayı direkt yapmıyoruz.
      // Hesaplama işini CalculationComponent'e devretmek için job oluşturuyoruz.
      queueCalculationJob({
        first: storedValue,
        second: currentValue,
        operator: pendingOperator,
        source: 'chain',
        nextOperator: selectedOperator,
      })
      return
    }

    setPendingOperator(selectedOperator)
    setIsWaitingForSecondValue(true)
    setIsExpressionInputActive(false)
  }

  // "=" butonu: bekleyen işlemi çalıştırır.
  const handleEqual = () => {
    setLastPressedValue('=')

    const shouldEvaluateExpression =
      isExpressionInputActive || displayValue.includes('(') || displayValue.includes(')')

    if (shouldEvaluateExpression) {
      const expressionText = displayValue.trim()
      const { resultText, isError } = evaluateParenthesizedExpression(expressionText)
      setDisplayValue(resultText)
      setLastPressedValue(expressionText)
      addExpressionToHistory(expressionText, resultText, isError)

      setStoredValue(null)
      setPendingOperator(null)
      setCalculationJob(null)
      setIsWaitingForSecondValue(true)
      setIsExpressionInputActive(false)
      return
    }

    if (pendingOperator === null || storedValue === null) {
      return
    }

    const secondValue = parseNumberInput(displayValue)

    if (secondValue === null) {
      const errorResult = 'Lütfen geçerli sayılar girin.'
      setDisplayValue(errorResult)
      addToHistoryByValues(
        storedValue.toString(),
        displayValue,
        pendingOperator,
        errorResult,
        true,
      )
      setStoredValue(null)
      setPendingOperator(null)
      setIsWaitingForSecondValue(true)
      setIsExpressionInputActive(false)
      return
    }

    queueCalculationJob({
      first: storedValue,
      second: secondValue,
      operator: pendingOperator,
      source: 'equal',
    })
  }

  // Tüm hesaplama ekranını sıfırlar.
  const clearAll = () => {
    setDisplayValue('0')
    setLastPressedValue('')
    setStoredValue(null)
    setPendingOperator(null)
    setCalculationJob(null)
    setIsWaitingForSecondValue(false)
    setIsExpressionInputActive(false)
  }

  // Hafıza (memory) tuşları:
  // - MC: hafızayı temizler
  // - MR: hafızadaki değeri ekrana geri getirir
  // - M+ / M-: ekrandaki sayıyı hafızaya ekler / çıkarır
  const clearMemory = () => {
    setMemoryValue(null)
    setLastPressedValue('MC')
  }

  const recallMemory = () => {
    if (memoryValue === null) {
      setDisplayValue('Hafıza boş.')
      return
    }

    applyPreparedNumber(memoryValue, 'MR')
  }

  const updateMemoryByDisplay = (direction: 'add' | 'subtract') => {
    const parsedDisplayValue = parseNumberInput(displayValue)

    if (parsedDisplayValue === null) {
      setDisplayValue('Hafıza için önce geçerli bir sayı girin.')
      return
    }

    setMemoryValue((previousMemory) => {
      const baseValue = previousMemory ?? 0
      const nextValue =
        direction === 'add'
          ? baseValue + parsedDisplayValue
          : baseValue - parsedDisplayValue
      return Number.isFinite(nextValue) ? nextValue : previousMemory
    })
    setLastPressedValue(direction === 'add' ? 'M+' : 'M-')
  }

  const usePiValue = () => {
    applyPreparedNumber(Math.PI, 'π')
  }

  const useEulerValue = () => {
    applyPreparedNumber(Math.E, 'e')
  }

  const toggleThemeMode = () => {
    setThemeMode((previousTheme) => (previousTheme === 'light' ? 'dark' : 'light'))
  }

  // Sadece geçmiş kayıtlarını temizlemek için ayrı bir fonksiyon.
  const clearHistory = () => {
    setHistory([])
  }

  // Geçmişten bir satıra tıklanınca ilgili verileri tekrar forma yüklüyoruz.
  const applyHistoryItem = (item: HistoryItem) => {
    setDisplayValue(item.result)
    setLastPressedValue(item.expression)
    setStoredValue(null)
    setPendingOperator(null)
    setCalculationJob(null)
    setIsWaitingForSecondValue(true)
    setIsExpressionInputActive(false)
  }

  const formatHistoryTimestamp = (timestamp: number): string => {
    const dateValue = new Date(timestamp)
    return dateValue.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const filteredHistory = history.filter((item) => {
    if (historyFilter === 'all') {
      return true
    }

    if (historyFilter === 'expression') {
      return item.operator === 'expr'
    }

    return historyFilter === 'error' ? item.isError : !item.isError
  })

  // UI'da kullanıcıya hangi ikinci değerin beklendiğini anlatan kısa metin.
  const operatorHint =
    pendingOperator === 'log'
      ? 'Log işleminde ikinci sayı tabandır.'
      : pendingOperator === 'mod'
        ? 'mod işleminde ikinci sayı bölen değerdir.'
      : isDegreeOperator(pendingOperator ?? '+')
        ? 'Seçili işlem derece bekliyor.'
        : isRatioOperator(pendingOperator ?? '+')
          ? 'Seçili işlem oran bekliyor.'
          : 'Rakam girip operatör seçebilir veya parantezli ifadeyi ekranda yazabilirsin. Polinom için Grafik ekranını kullan.'

  // Component kapanırken bekleyen timeout'u temizliyoruz.
  useEffect(() => {
    return () => {
      if (keyFlashTimeoutRef.current) {
        clearTimeout(keyFlashTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    keyboardContextRef.current = {
      appendDecimal,
      appendDigit,
      appendExpressionToken,
      backspaceDisplay,
      clearAll,
      flashVirtualKey,
      handleEqual,
      handleOperatorSelect,
      displayValue,
      isExpressionInputActive,
      isShortcutHelpOpen,
    }
  })

  // Klavye desteği:
  // - 0..9       => sayı girişi
  // - . ,        => ondalık ayırıcı
  // - + - * /    => temel 4 işlem
  // - ^          => üs alma (x^n)
  // - e          => e^x hesabı
  // - %          => yüzde hesabı
  // - m          => mod alma
  // - l          => ln(x)
  // - g          => logaritma (tabanlı log)
  // - r          => kök (n√x)
  // - p          => binde (‰) hesabı
  // - s          => kare alma (x²)
  // - i          => tersini alma (1/x)
  // - u          => mutlak değer (|x|)
  // - f          => faktöriyel (x!)
  // - ( )        => ekranda parantezli ifade girişini başlatır/sürdürür
  // - c          => C (temizle)
  // - Backspace  => son karakteri sil
  // - Delete     => C gibi tamamını temizle
  // - Enter / =  => sonucu hesapla
  // - Escape     => temizle (yardım penceresi açıksa önce onu kapatır)
  // - H / ?      => mini klavye kısayol rehberini aç/kapat
  // Not: Ctrl/Meta/Alt kombinasyonlarını özellikle yakalamıyoruz.

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const context = keyboardContextRef.current
      if (!context) {
        return
      }

      if (event.ctrlKey || event.metaKey || event.altKey) {
        return
      }

      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }

      const lowerKey = event.key.toLowerCase()
      const isHelpToggleKey = event.key === '?' || lowerKey === 'h'

      if (isHelpToggleKey) {
        event.preventDefault()
        setIsShortcutHelpOpen((previousState) => !previousState)
        return
      }

      if (context.isShortcutHelpOpen) {
        if (event.key === 'Escape') {
          event.preventDefault()
          setIsShortcutHelpOpen(false)
        }
        return
      }

      if (lowerKey === 'c') {
        event.preventDefault()
        context.clearAll()
        context.flashVirtualKey('clear')
        return
      }

      const isExpressionTokenKey =
        /^[0-9]$/.test(event.key) ||
        event.key === '.' ||
        event.key === ',' ||
        event.key === '+' ||
        event.key === '-' ||
        event.key === '*' ||
        event.key === '/' ||
        event.key === '^' ||
        event.key === '(' ||
        event.key === ')'
      const shouldWriteExpressionToken =
        context.isExpressionInputActive || event.key === '(' || event.key === ')'

      if (isExpressionTokenKey && shouldWriteExpressionToken) {
        event.preventDefault()
        context.appendExpressionToken(event.key)
        context.flashVirtualKey(event.key === ',' ? '.' : event.key)
        return
      }

      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault()
        context.appendDigit(event.key)
        context.flashVirtualKey(event.key)
        return
      }

      if (event.key === '.' || event.key === ',') {
        event.preventDefault()
        context.appendDecimal()
        context.flashVirtualKey('.')
        return
      }

      if (event.key === 'Backspace') {
        event.preventDefault()
        context.backspaceDisplay()
        context.flashVirtualKey('backspace')
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        context.handleEqual()
        context.flashVirtualKey('=')
        return
      }


      if (event.key === 'Escape') {
        event.preventDefault()
        context.clearAll()
        context.flashVirtualKey('clear')
        return
      }

      if (event.key === 'Delete') {
        event.preventDefault()
        context.clearAll()
        context.flashVirtualKey('clear')
        return
      }

      const operatorMap: Record<string, Operator> = {
        '+': '+',
        '-': '-',
        '*': '*',
        '/': '/',
        '^': '^',
        '%': '%',
      }

      if (operatorMap[event.key]) {
        event.preventDefault()
        context.handleOperatorSelect(operatorMap[event.key])
        context.flashVirtualKey(operatorMap[event.key])
        return
      }

      if (lowerKey === 'l') {
        event.preventDefault()
        context.handleOperatorSelect('ln')
        context.flashVirtualKey('ln')
        return
      }

      if (lowerKey === 'e') {
        event.preventDefault()
        context.handleOperatorSelect('e^x')
        context.flashVirtualKey('e^x')
        return
      }

      if (lowerKey === 'g') {
        event.preventDefault()
        context.handleOperatorSelect('log')
        context.flashVirtualKey('log')
        return
      }

      if (lowerKey === 'r') {
        event.preventDefault()
        context.handleOperatorSelect('√')
        context.flashVirtualKey('√')
        return
      }

      if (lowerKey === 'p') {
        event.preventDefault()
        context.handleOperatorSelect('‰')
        context.flashVirtualKey('‰')
        return
      }

      if (lowerKey === 'm') {
        event.preventDefault()
        context.handleOperatorSelect('mod')
        context.flashVirtualKey('mod')
        return
      }

      if (lowerKey === 's') {
        event.preventDefault()
        context.handleOperatorSelect('x²')
        context.flashVirtualKey('x²')
        return
      }

      if (lowerKey === 'i') {
        event.preventDefault()
        context.handleOperatorSelect('1/x')
        context.flashVirtualKey('1/x')
        return
      }

      if (lowerKey === 'u') {
        event.preventDefault()
        context.handleOperatorSelect('|x|')
        context.flashVirtualKey('|x|')
        return
      }

      if (lowerKey === 'f') {
        event.preventDefault()
        context.handleOperatorSelect('x!')
        context.flashVirtualKey('x!')
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    // Layout'u iki kolona ayırıyoruz: solda hesap makinesi, sağda işlem geçmişi.
    <div className={`app-layout ${themeMode === 'dark' ? 'theme-dark' : ''}`}>
      {calculationJob && (
        // calculationJob varsa renderless hesaplama component'i çalışır.
        // Sonucu onResult callback'i ile tekrar App state'ine taşır.
        <CalculationComponent
          jobId={calculationJob.id}
          first={calculationJob.first}
          second={calculationJob.second}
          operator={calculationJob.operator}
          onResult={(jobId, resultText, isError) => {
            if (calculationJob.id !== jobId) {
              return
            }

            // React StrictMode'da effect iki kez çalışabildiği için
            // aynı job id'den gelen ikinci sonucu yoksayıyoruz.
            if (handledJobIdsRef.current.has(jobId)) {
              return
            }

            handledJobIdsRef.current.add(jobId)

            handleCalculationResult(calculationJob, resultText, isError)
          }}
        />
      )}

      {/* Uygulamanın hesaplama tarafı */}
      <main className="calculator">
        <div className="calculator-header">
          <h1>Hesap Makinesi</h1>
          <button
            type="button"
            className={`theme-switch ${themeMode === 'dark' ? 'dark' : 'light'}`}
            role="switch"
            aria-checked={themeMode === 'dark'}
            aria-label="Tema değiştir"
            onClick={toggleThemeMode}
          >
            <span className="theme-switch-track">
              <span className="theme-switch-thumb" />
            </span>
            <span className="theme-switch-text">
              {themeMode === 'dark' ? 'Koyu Tema' : 'Açık Tema'}
            </span>
          </button>
        </div>
        <p className="subtitle">
          Toplama, çıkarma, çarpma, bölme, üs, kök, logaritma, ln, e^x, yüzde,
          binde, kare, ters, mutlak değer, faktöriyel, mod ve polinom denklemler
        </p>

        {/* 5 satırlık ekran alanı: alt satırda sonuç, sol üstte son basılan değer. */}
        <div className="display-section">
          <span className="display-label">Ekran (5 satır)</span>
          <div className="display-board" role="status" aria-live="polite">
            <span className="last-pressed">{lastPressedValue || '\u00A0'}</span>
            <span className="display-value">{displayValue}</span>
          </div>
          <p className="input-hint">{operatorHint}</p>
        </div>

        <p className="shortcut-hint">
          Klavye kısayol rehberi için <kbd>H</kbd> tuşuna basabilirsin.
        </p>

        {/* Bilimsel operatör + sabitler sayıların üstünde, hafıza + 4 işlem yan tarafta */}
        <div className="keypad-layout">
          <div className="scientific-and-constants">
            <div className="scientific-operator-pad">
              <ScientificOperatorButtons
                onSelect={handleOperatorSelect}
                activeOperator={pendingOperator}
              />
            </div>
            <div className="constants-pad" role="group" aria-label="Sabit değer tuşları">
              <button type="button" className="operator-button constant" onClick={usePiValue}>
                π
              </button>
              <button type="button" className="operator-button constant" onClick={useEulerValue}>
                e
              </button>
              <button
                type="button"
                className={`operator-button paren ${activeVirtualKey === '(' ? 'key-pressed' : ''}`}
                onClick={() => appendExpressionToken('(')}
              >
                (
              </button>
              <button
                type="button"
                className={`operator-button paren ${activeVirtualKey === ')' ? 'key-pressed' : ''}`}
                onClick={() => appendExpressionToken(')')}
              >
                )
              </button>
              <button
                type="button"
                className="operator-button graph"
                onClick={openEquationGraphFromDisplay}
              >
                Grafik
              </button>
            </div>
          </div>

          <div className="main-pad-row">
            <div className="number-pad">
              <button
                type="button"
                className={activeVirtualKey === '7' ? 'key-pressed' : ''}
                onClick={() => appendDigit('7')}
              >
                7
              </button>
              <button
                type="button"
                className={activeVirtualKey === '8' ? 'key-pressed' : ''}
                onClick={() => appendDigit('8')}
              >
                8
              </button>
              <button
                type="button"
                className={activeVirtualKey === '9' ? 'key-pressed' : ''}
                onClick={() => appendDigit('9')}
              >
                9
              </button>
              <button
                type="button"
                className={activeVirtualKey === '4' ? 'key-pressed' : ''}
                onClick={() => appendDigit('4')}
              >
                4
              </button>
              <button
                type="button"
                className={activeVirtualKey === '5' ? 'key-pressed' : ''}
                onClick={() => appendDigit('5')}
              >
                5
              </button>
              <button
                type="button"
                className={activeVirtualKey === '6' ? 'key-pressed' : ''}
                onClick={() => appendDigit('6')}
              >
                6
              </button>
              <button
                type="button"
                className={activeVirtualKey === '1' ? 'key-pressed' : ''}
                onClick={() => appendDigit('1')}
              >
                1
              </button>
              <button
                type="button"
                className={activeVirtualKey === '2' ? 'key-pressed' : ''}
                onClick={() => appendDigit('2')}
              >
                2
              </button>
              <button
                type="button"
                className={activeVirtualKey === '3' ? 'key-pressed' : ''}
                onClick={() => appendDigit('3')}
              >
                3
              </button>
              <button
                type="button"
                className={activeVirtualKey === '±' ? 'key-pressed' : ''}
                onClick={toggleSign}
              >
                ±
              </button>
              <button
                type="button"
                className={activeVirtualKey === '0' ? 'key-pressed' : ''}
                onClick={() => appendDigit('0')}
              >
                0
              </button>
              <button
                type="button"
                className={activeVirtualKey === '.' ? 'key-pressed' : ''}
                onClick={appendDecimal}
              >
                .
              </button>
            </div>

            <div className="side-operations">
              <div className="memory-pad" role="group" aria-label="Hafıza tuşları">
                <button
                  type="button"
                  className={`utility-button memory ${memoryValue !== null ? 'active' : ''}`}
                  onClick={clearMemory}
                >
                  MC
                </button>
                <button
                  type="button"
                  className="utility-button memory"
                  onClick={recallMemory}
                  disabled={memoryValue === null}
                >
                  MR
                </button>
                <button
                  type="button"
                  className="utility-button memory"
                  onClick={() => updateMemoryByDisplay('add')}
                >
                  M+
                </button>
                <button
                  type="button"
                  className="utility-button memory"
                  onClick={() => updateMemoryByDisplay('subtract')}
                >
                  M-
                </button>
              </div>
              <div className="basic-operator-pad">
                <BasicOperatorButtons
                  onSelect={handleOperatorSelect}
                  activeOperator={pendingOperator}
                />
              </div>
            </div>
          </div>
          <div className="actions">
            <button
              type="button"
              className={`equal ${activeVirtualKey === '=' ? 'key-pressed' : ''}`}
              onClick={handleEqual}
            >
              =
            </button>
            <button
              type="button"
              className={`secondary ${activeVirtualKey === 'clear' ? 'key-pressed' : ''}`}
              onClick={clearAll}
            >
              C
            </button>
            <button
              type="button"
              className={`secondary ${activeVirtualKey === 'backspace' ? 'key-pressed' : ''}`}
              onClick={backspaceDisplay}
              aria-label="Son karakteri sil"
            >
              ⌫
            </button>
          </div>

        </div>
      </main>

      {/* Sağdaki ayrı div: son 10 işlemin tarihçesi */}
      <aside className="history" aria-label="İşlem geçmişi">
        <div className="history-header">
          <h2>İşlem Geçmişi</h2>
          <button
            type="button"
            className="clear-history"
            onClick={clearHistory}
            disabled={history.length === 0}
          >
            Tümünü Temizle
          </button>
        </div>
        <div className="history-filters" role="group" aria-label="Geçmiş filtresi">
          <button
            type="button"
            className={`history-filter ${historyFilter === 'all' ? 'active' : ''}`}
            onClick={() => setHistoryFilter('all')}
          >
            Tümü
          </button>
          <button
            type="button"
            className={`history-filter ${historyFilter === 'success' ? 'active' : ''}`}
            onClick={() => setHistoryFilter('success')}
          >
            Başarılı
          </button>
          <button
            type="button"
            className={`history-filter ${historyFilter === 'error' ? 'active' : ''}`}
            onClick={() => setHistoryFilter('error')}
          >
            Hatalı
          </button>
          <button
            type="button"
            className={`history-filter ${historyFilter === 'expression' ? 'active' : ''}`}
            onClick={() => setHistoryFilter('expression')}
          >
            İfade
          </button>
        </div>

        <div className="history-content">
          {filteredHistory.length === 0 ? (
            <p className="empty-history">
              {history.length === 0
                ? 'Henüz işlem yapılmadı.'
                : 'Seçili filtrede gösterilecek kayıt yok.'}
            </p>
          ) : (
            <ol className="history-list">
              {filteredHistory.map((item, index) => (
                <li key={`${item.expression}-${index}`} className="history-row">
                  <span className="history-index">{index + 1}.</span>
                  <button
                    type="button"
                    className={`history-item ${item.isError ? 'error' : 'success'}`}
                    onClick={() => applyHistoryItem(item)}
                  >
                    <span className="history-expression">{item.expression}</span>
                    <span className="history-timestamp">
                      {formatHistoryTimestamp(item.createdAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>

      {/* H veya ? ile açılan mini kısayol rehberi */}
      {isShortcutHelpOpen && (
        <div
          className="shortcut-backdrop"
          role="presentation"
          onClick={() => setIsShortcutHelpOpen(false)}
        >
          <div
            className="shortcut-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Klavye kısayol rehberi"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Klavye Kısayol Rehberi</h3>
            <ul className="shortcut-list">
              <li>
                <kbd>0</kbd> - <kbd>9</kbd> : Sayı girişi
              </li>
              <li>
                <kbd>.</kbd> / <kbd>,</kbd> : Ondalık ayırıcı
              </li>
              <li>
                <kbd>+</kbd> <kbd>-</kbd> <kbd>*</kbd> <kbd>/</kbd> : 4 işlem
              </li>
              <li>
                <kbd>(</kbd> <kbd>)</kbd> : Parantezli ifadede grup önceliği
              </li>
              <li className="shortcut-section">
                <strong>Bilimsel kısayollar:</strong>
              </li>
              <li>
                <kbd>^</kbd> : Üs alma (<code>x^n</code>)
              </li>
              <li>
                <kbd>R</kbd> : Kök alma (<code>n√x</code>) — 2. sayı derece
              </li>
              <li>
                <kbd>L</kbd> : Doğal logaritma (<code>ln(x)</code>)
              </li>
              <li>
                <kbd>E</kbd> : Üstel fonksiyon (<code>e^x</code>)
              </li>
              <li>
                <kbd>G</kbd> : Tabanlı logaritma (<code>log(x)</code>) — 2. sayı taban
              </li>
              <li>
                <kbd>%</kbd> : Yüzde hesabı — 2. sayı oran
              </li>
              <li>
                <kbd>P</kbd> : Binde hesabı (<code>‰</code>) — 2. sayı oran
              </li>
              <li>
                <kbd>M</kbd> : Mod alma (<code>x mod y</code>) — 2. sayı bölen
              </li>
              <li>
                <kbd>S</kbd> : Kare alma (<code>x²</code>)
              </li>
              <li>
                <kbd>I</kbd> : Tersini alma (<code>1/x</code>)
              </li>
              <li>
                <kbd>U</kbd> : Mutlak değer (<code>|x|</code>)
              </li>
              <li>
                <kbd>F</kbd> : Faktöriyel (<code>x!</code>)
              </li>
              <li className="shortcut-section">
                <strong>Yardımcı tuşlar (ekran üzerinden):</strong>
              </li>
              <li>
                <kbd>MC</kbd> : Hafızayı temizler
              </li>
              <li>
                <kbd>MR</kbd> : Hafızadaki değeri ekrana getirir
              </li>
              <li>
                <kbd>M+</kbd> / <kbd>M-</kbd> : Ekrandaki sayıyı hafızaya ekler / çıkarır
              </li>
              <li>
                <kbd>π</kbd> / <kbd>e</kbd> : Sabit sayıları ekrana yazar
              </li>
              <li>
                <kbd>Backspace</kbd> : Son girilen rakamı sil
              </li>
              <li>
                <kbd>Delete</kbd> : C butonu gibi temizler
              </li>
              <li>
                <kbd>Enter</kbd> : Hesapla
              </li>
              <li>
                <kbd>=</kbd> : Denklemde eşittir işareti ekler
              </li>
              <li>
                <kbd>Escape</kbd> : Temizle (rehber açıksa önce rehberi kapatır)
              </li>
              <li>
                <kbd>C</kbd> : C butonu (temizle)
              </li>
              <li>
                <kbd>H</kbd> veya <kbd>?</kbd> : Rehberi aç / kapat
              </li>
            </ul>
            <button type="button" onClick={() => setIsShortcutHelpOpen(false)}>
              Kapat
            </button>
          </div>
        </div>
      )}

      {isEquationGraphOpen && (
        <div
          className="graph-backdrop"
          role="presentation"
          onClick={() => {
            setIsEquationGraphOpen(false)
            setEquationGraphError('')
          }}
        >
          <div
            className="graph-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Denklem grafiği"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Denklem Grafiği</h3>
            <label className="graph-input-label" htmlFor="graph-expression-input">
              Fonksiyon / denklem
            </label>
            <div className="graph-form">
              <input
                id="graph-expression-input"
                className="graph-input"
                type="text"
                value={equationGraphInput}
                onChange={(event) => {
                  setEquationGraphInput(event.target.value)
                  setEquationSolveResult('')
                  setIsEquationSolveError(false)
                }}
                placeholder="örn: a²+5 veya a²+5=9"
                autoComplete="off"
                spellCheck={false}
              />
              <div className="graph-action-buttons">
                <button type="button" className="graph-draw-button" onClick={handleGraphInputSubmit}>
                  Grafiği Çiz
                </button>
                <button type="button" className="graph-solve-button" onClick={handleGraphSolveSubmit}>
                  Denklemi Çöz
                </button>
              </div>
            </div>
            {equationSolveResult && (
              <div className={`graph-solution ${isEquationSolveError ? 'error' : ''}`}>
                <p className="graph-solution-title">Çözüm Sonucu</p>
                <p className="graph-solution-value">{equationSolveResult}</p>
              </div>
            )}
            <p className="graph-note">
              Not: <code>=</code> yazarsan <code>(sol - sağ)=0</code> grafiği çizilir; eşittir
              yoksa doğrudan <code>y = f(a)</code> çizilir.
            </p>
            {equationGraphData ? (
              <>
                <p className="graph-summary">
                  Denklem: <code>{equationGraphData.expression}</code>
                </p>
                <p className="graph-summary">
                  Grafiği çizilen fonksiyon: <code>y = {equationGraphData.polynomialText}</code>
                </p>
                <div className="graph-board" role="img" aria-label="Koordinat düzleminde denklem grafiği">
                  <svg viewBox="0 0 360 260" preserveAspectRatio="none">
                    {(() => {
                      const width = 360
                      const height = 260
                      const rangeX = equationGraphData.xMax - equationGraphData.xMin
                      const rangeY = equationGraphData.yMax - equationGraphData.yMin
                      const toSvgX = (x: number) =>
                        ((x - equationGraphData.xMin) / rangeX) * width
                      const toSvgY = (y: number) =>
                        height - ((y - equationGraphData.yMin) / rangeY) * height
                      const graphPath = equationGraphData.points
                        .map((point, index) => {
                          const command = index === 0 ? 'M' : 'L'
                          return `${command} ${toSvgX(point.x)} ${toSvgY(point.y)}`
                        })
                        .join(' ')
                      const xAxisVisible =
                        equationGraphData.yMin <= 0 && equationGraphData.yMax >= 0
                      const yAxisVisible =
                        equationGraphData.xMin <= 0 && equationGraphData.xMax >= 0
                      const xAxisY = toSvgY(0)
                      const yAxisX = toSvgX(0)

                      return (
                        <>
                          <rect x="0" y="0" width={width} height={height} className="graph-bg" />
                          {xAxisVisible && (
                            <line
                              x1="0"
                              y1={xAxisY}
                              x2={width}
                              y2={xAxisY}
                              className="graph-axis"
                            />
                          )}
                          {yAxisVisible && (
                            <line
                              x1={yAxisX}
                              y1="0"
                              x2={yAxisX}
                              y2={height}
                              className="graph-axis"
                            />
                          )}
                          <path d={graphPath} className="graph-curve" />
                        </>
                      )
                    })()}
                  </svg>
                </div>
                <p className="graph-range">
                  a aralığı: [{equationGraphData.xMin}, {equationGraphData.xMax}] | y aralığı:{' '}
                  [{formatCompactNumber(equationGraphData.yMin)}, {formatCompactNumber(equationGraphData.yMax)}]
                </p>
              </>
            ) : equationGraphError ? (
              <p className="graph-error">{equationGraphError || 'Grafik oluşturulamadı.'}</p>
            ) : (
              <p className="graph-empty">Grafik için yukarıdan fonksiyon veya denklem girin.</p>
            )}
            <button
              type="button"
              className="graph-close-button"
              onClick={() => {
                setIsEquationGraphOpen(false)
                setEquationGraphError('')
                setEquationSolveResult('')
                setIsEquationSolveError(false)
              }}
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
