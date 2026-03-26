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

type QuadraticSolveResult = {
  resultText: string
  isError: boolean
}

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

  const normalizedTokens: string[] = []
  for (const token of tokens) {
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

const evaluateQuadraticExpression = (
  rawExpression: string,
  variableSymbol = 'a',
): QuadraticSolveResult => {
  const expression = rawExpression.replaceAll(',', '.').replace(/\s+/g, '')
  if (!expression) {
    return {
      resultText: `Lütfen ${variableSymbol} içeren bir denklem girin.`,
      isError: true,
    }
  }

  const normalizedExpression = expression
    .replaceAll(variableSymbol.toUpperCase(), variableSymbol)
    .replace(/\^2/g, '²')
  const expressionParts = normalizedExpression.split('=')

  if (expressionParts.length !== 2) {
    return {
      resultText: 'Denklem bir adet "=" içermelidir.',
      isError: true,
    }
  }

  const [leftSide, rightSide] = expressionParts
  if (leftSide === '' || rightSide === '') {
    return {
      resultText: 'Eşitliğin her iki tarafında da ifade olmalıdır.',
      isError: true,
    }
  }

  const normalizeTerms = (sideExpression: string): string[] => {
    const withLeadingSign = /^[+-]/.test(sideExpression) ? sideExpression : `+${sideExpression}`
    return withLeadingSign.match(/[+-][^+-]+/g) ?? []
  }

  type Coefficients = {
    a: number
    b: number
    c: number
  }

  const parseSide = (sideExpression: string): Coefficients | null => {
    const terms = normalizeTerms(sideExpression)
    if (terms.length === 0) {
      return null
    }

    let coefficientA = 0
    let coefficientB = 0
    let coefficientC = 0

    for (const term of terms) {
      if (term.includes(`${variableSymbol}²`)) {
        const rawCoefficient = term.replace(`${variableSymbol}²`, '').replace('²', '')
        const parsedCoefficient =
          rawCoefficient === '+' || rawCoefficient === ''
            ? 1
            : rawCoefficient === '-'
              ? -1
              : Number(rawCoefficient)

        if (!Number.isFinite(parsedCoefficient)) {
          return null
        }

        coefficientA += parsedCoefficient
        continue
      }

      if (term.includes(variableSymbol)) {
        const rawCoefficient = term.replace(variableSymbol, '')
        const parsedCoefficient =
          rawCoefficient === '+' || rawCoefficient === ''
            ? 1
            : rawCoefficient === '-'
              ? -1
              : Number(rawCoefficient)

        if (!Number.isFinite(parsedCoefficient)) {
          return null
        }

        coefficientB += parsedCoefficient
        continue
      }

      const parsedConstant = Number(term)
      if (!Number.isFinite(parsedConstant)) {
        return null
      }

      coefficientC += parsedConstant
    }

    return {
      a: coefficientA,
      b: coefficientB,
      c: coefficientC,
    }
  }

  const leftCoefficients = parseSide(leftSide)
  const rightCoefficients = parseSide(rightSide)
  if (!leftCoefficients || !rightCoefficients) {
    return {
      resultText: `Denklem formatı geçersiz. Örn: 5${variableSymbol}²+3${variableSymbol}=8`,
      isError: true,
    }
  }

  const coefficientA = leftCoefficients.a - rightCoefficients.a
  const coefficientB = leftCoefficients.b - rightCoefficients.b
  const coefficientC = leftCoefficients.c - rightCoefficients.c
  const epsilon = 1e-10
  const isAlmostZero = (value: number): boolean => Math.abs(value) < epsilon
  const formatValue = (value: number): string => Number.parseFloat(value.toPrecision(12)).toString()

  if (isAlmostZero(coefficientA)) {
    if (isAlmostZero(coefficientB)) {
      if (isAlmostZero(coefficientC)) {
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

    const linearRoot = -coefficientC / coefficientB
    if (!Number.isFinite(linearRoot)) {
      return {
        resultText: 'Denklem sonucu sayı sınırını aşıyor.',
        isError: true,
      }
    }

    return {
      resultText: `${variableSymbol} = ${formatValue(linearRoot)}`,
      isError: false,
    }
  }

  const delta = coefficientB ** 2 - 4 * coefficientA * coefficientC
  if (delta > epsilon) {
    const sqrtDelta = Math.sqrt(delta)
    const root1 = (-coefficientB + sqrtDelta) / (2 * coefficientA)
    const root2 = (-coefficientB - sqrtDelta) / (2 * coefficientA)

    if (!Number.isFinite(root1) || !Number.isFinite(root2)) {
      return {
        resultText: 'Denklem sonucu sayı sınırını aşıyor.',
        isError: true,
      }
    }

    return {
      resultText: `${variableSymbol}₁ = ${formatValue(root1)}, ${variableSymbol}₂ = ${formatValue(root2)}`,
      isError: false,
    }
  }

  if (isAlmostZero(delta)) {
    const repeatedRoot = -coefficientB / (2 * coefficientA)
    if (!Number.isFinite(repeatedRoot)) {
      return {
        resultText: 'Denklem sonucu sayı sınırını aşıyor.',
        isError: true,
      }
    }

    return {
      resultText: `${variableSymbol} = ${formatValue(repeatedRoot)}`,
      isError: false,
    }
  }

  return {
    resultText: 'Gerçek sayılarda kök yok (Δ < 0).',
    isError: true,
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
  const [isWaitingForSecondValue, setIsWaitingForSecondValue] =
    useState<boolean>(false)
  const [isExpressionInputActive, setIsExpressionInputActive] = useState<boolean>(false)
  const [isQuadraticModeActive, setIsQuadraticModeActive] = useState<boolean>(false)
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
    enterQuadraticModeWithToken: (token: string) => void
    solveQuadraticEquationFromDisplay: () => void
    displayValue: string
    isExpressionInputActive: boolean
    isQuadraticModeActive: boolean
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
    const numericDisplayCandidate = displayValue.trim()
    const parsedCurrentValue = parseNumberInput(numericDisplayCandidate)
    const canReuseCurrentDisplay =
      isExpressionInputActive || (parsedCurrentValue !== null && displayValue !== '0')
    const nextValue = `${canReuseCurrentDisplay ? displayValue : ''}${normalizedToken}`

    setDisplayValue(nextValue)
    setLastPressedValue(nextValue)
    setStoredValue(null)
    setPendingOperator(null)
    setCalculationJob(null)
    setIsWaitingForSecondValue(false)
    setIsExpressionInputActive(true)
    setIsQuadraticModeActive(false)
  }

  const enterQuadraticModeWithToken = (token: string) => {
    const normalizedToken = token === '^2' ? '²' : token
    const canAppendToCurrentDisplay =
      displayValue !== '0' &&
      (isQuadraticModeActive || parseNumberInput(displayValue) !== null || isExpressionInputActive)
    const nextValue = `${canAppendToCurrentDisplay ? displayValue : ''}${normalizedToken}`

    setDisplayValue(nextValue)
    setLastPressedValue(nextValue)
    setStoredValue(null)
    setPendingOperator(null)
    setCalculationJob(null)
    setIsWaitingForSecondValue(false)
    setIsExpressionInputActive(false)
    setIsQuadraticModeActive(true)
  }

  const solveQuadraticEquationFromDisplay = () => {
    const expressionText = displayValue.trim()
    const { resultText, isError } = evaluateQuadraticExpression(expressionText, 'a')

    setDisplayValue(resultText)
    setLastPressedValue(expressionText)
    addExpressionToHistory(expressionText, resultText, isError)

    setStoredValue(null)
    setPendingOperator(null)
    setCalculationJob(null)
    setIsWaitingForSecondValue(true)
    setIsExpressionInputActive(false)
    setIsQuadraticModeActive(false)
  }

  // Rakam butonları için giriş fonksiyonu.
  // Eğer yeni ikinci sayı bekleniyorsa ekrandaki değeri sıfırdan başlatır.
  const appendDigit = (digit: string) => {
    if (isQuadraticModeActive) {
      enterQuadraticModeWithToken(digit)
      return
    }

    if (isExpressionInputActive) {
      appendExpressionToken(digit)
      return
    }

    if (isWaitingForSecondValue || parseNumberInput(displayValue) === null) {
      setDisplayValue(digit)
      setLastPressedValue(digit)
      setIsWaitingForSecondValue(false)
      setIsExpressionInputActive(false)
      setIsQuadraticModeActive(false)
      return
    }

    if (displayValue === '0') {
      setDisplayValue(digit)
      setLastPressedValue(digit)
      setIsExpressionInputActive(false)
      setIsQuadraticModeActive(false)
      return
    }

    const nextValue = `${displayValue}${digit}`
    setDisplayValue(nextValue)
    setLastPressedValue(nextValue)
    setIsExpressionInputActive(false)
    setIsQuadraticModeActive(false)
  }

  // Ondalık nokta ekleme işlemi.
  const appendDecimal = () => {
    if (isQuadraticModeActive) {
      enterQuadraticModeWithToken('.')
      return
    }

    if (isExpressionInputActive) {
      appendExpressionToken('.')
      return
    }

    if (isWaitingForSecondValue || parseNumberInput(displayValue) === null) {
      setDisplayValue('0.')
      setLastPressedValue('0.')
      setIsWaitingForSecondValue(false)
      setIsExpressionInputActive(false)
      setIsQuadraticModeActive(false)
      return
    }

    if (!displayValue.includes('.')) {
      const nextValue = `${displayValue}.`
      setDisplayValue(nextValue)
      setLastPressedValue(nextValue)
      setIsExpressionInputActive(false)
      setIsQuadraticModeActive(false)
    }
  }

  // Pozitif/negatif işaretini çevirir (±).
  const toggleSign = () => {
    if (isExpressionInputActive || isQuadraticModeActive) {
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
    if (isExpressionInputActive || isQuadraticModeActive) {
      if (displayValue.length <= 1) {
        setDisplayValue('0')
        setLastPressedValue('')
        setIsExpressionInputActive(false)
        setIsQuadraticModeActive(false)
        return
      }

      const nextValue = displayValue.slice(0, -1)
      setDisplayValue(nextValue)
      setLastPressedValue(nextValue)

      if (!/[()+\-*/^=]/.test(nextValue)) {
        setIsExpressionInputActive(false)
        setIsQuadraticModeActive(false)
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
    if (isQuadraticModeActive) {
      if (
        selectedOperator === '+' ||
        selectedOperator === '-' ||
        selectedOperator === '*' ||
        selectedOperator === '/' ||
        selectedOperator === '^'
      ) {
        enterQuadraticModeWithToken(selectedOperator)
        return
      }

      if (selectedOperator === 'x²') {
        const normalizedDisplay = displayValue.replace(/\s+/g, '')
        const tokenForSquare =
          normalizedDisplay.endsWith('a') || normalizedDisplay.endsWith('A') ? '²' : 'a²'
        enterQuadraticModeWithToken(tokenForSquare)
        return
      }

      setDisplayValue('Denklem modunda +, -, *, /, ^ ve x² kullanılabilir.')
      return
    }

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
    setIsQuadraticModeActive(false)
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
      setIsQuadraticModeActive(false)
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
      setIsQuadraticModeActive(false)
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
    setIsQuadraticModeActive(false)
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
    setIsQuadraticModeActive(false)
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
    setIsQuadraticModeActive(false)
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
          : isQuadraticModeActive
            ? 'Denklem modu aktif: örn 5a^2+3a=8 yazıp Denklem Çöz veya = kullan.'
          : 'Rakam girip operatör seçebilir veya parantezli ifadeyi ekranda yazabilirsin.'

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
      enterQuadraticModeWithToken,
      solveQuadraticEquationFromDisplay,
      displayValue,
      isExpressionInputActive,
      isQuadraticModeActive,
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
  // - a          => denklem modunda değişken ekler
  // - q          => ekrandaki ikinci derece denklemi çözer
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

      if (lowerKey === 'q') {
        event.preventDefault()
        context.solveQuadraticEquationFromDisplay()
        context.flashVirtualKey('solve-equation')
        return
      }

      if (lowerKey === 'a') {
        event.preventDefault()
        context.enterQuadraticModeWithToken('a')
        context.flashVirtualKey('a')
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
        const currentDisplayValue = context.displayValue.toLowerCase()
        const shouldSolveQuadratic = context.isQuadraticModeActive || currentDisplayValue.includes('a')

        if (shouldSolveQuadratic) {
          context.solveQuadraticEquationFromDisplay()
          context.flashVirtualKey('solve-equation')
          return
        }

        context.handleEqual()
        context.flashVirtualKey('=')
        return
      }

      if (event.key === '=') {
        event.preventDefault()
        context.enterQuadraticModeWithToken('=')
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
          binde, kare, ters, mutlak değer, faktöriyel, mod ve ikinci derece denklem
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
                className={`operator-button variable ${activeVirtualKey === 'a' ? 'key-pressed' : ''}`}
                onClick={() => enterQuadraticModeWithToken('a')}
              >
                a
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
              <li>
                <kbd>A</kbd> : Denklem modunda değişken ekler
              </li>
              <li>
                <kbd>Q</kbd> : Ekrandaki ikinci derece denklemi çözer
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
    </div>
  )
}

export default App
