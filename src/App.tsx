import { useState } from 'react'
import './App.css'
import {
  isDegreeOperator,
  isRatioOperator,
  OperatorOptions,
  operatorCalculators,
  type Operator,
} from './components/operators'

type HistoryItem = {
  firstValue: string
  secondValue: string
  operator: Operator
  result: string
  expression: string
  isError: boolean
}

function App() {
  // Input alanlarından gelen değerleri string olarak tutuyoruz.
  // Çünkü HTML input'lar değeri her zaman string döndürür.
  const [firstValue, setFirstValue] = useState<string>('')
  const [secondValue, setSecondValue] = useState<string>('')

  // Varsayılan işlem toplama olsun.
  const [operator, setOperator] = useState<Operator>('+')

  // Hesaplanan sonucu ekranda göstermek için state.
  // Başlangıçta "0" gösteriyoruz.
  const [result, setResult] = useState<string>('0')

  // Kullanıcının yaptığı son işlemleri burada tutuyoruz.
  // En güncel işlem en üstte olacak.
  const [history, setHistory] = useState<HistoryItem[]>([])

  // Input'a yazılırken sadece sayıya uygun karakterlere izin veriyoruz.
  // Böylece "e" gibi değerler daha giriş aşamasında engellenir.
  const updateNumberInput = (
    rawValue: string,
    setValue: (nextValue: string) => void,
  ) => {
    const normalizedValue = rawValue.replace(',', '.')
    const isValidPartialNumber = /^-?\d*(\.\d*)?$/.test(normalizedValue)

    if (isValidPartialNumber) {
      setValue(normalizedValue)
    }
  }

  // Hesaplama anında değerin gerçekten geçerli sayı olup olmadığını kesin kontrol ediyoruz.
  const parseNumberInput = (rawValue: string): number | null => {
    const trimmedValue = rawValue.trim()
    const isValidNumber = /^-?(?:\d+\.?\d*|\.\d+)$/.test(trimmedValue)

    if (!isValidNumber) {
      return null
    }

    const parsedValue = Number(trimmedValue)
    return Number.isFinite(parsedValue) ? parsedValue : null
  }

  // Geçmişte görünürken boş değerleri daha anlaşılır göstermek için yardımcı fonksiyon.
  const toDisplayValue = (rawValue: string): string => {
    const trimmedValue = rawValue.trim()
    return trimmedValue === '' ? 'boş' : trimmedValue
  }

  // Geçmişte görünecek ifade metnini tek noktadan üretmek okunabilirliği artırır.
  const buildExpression = (
    first: string,
    selectedOperator: Operator,
    second: string,
    resultText: string,
  ): string => {
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

  // Verilen değerlerle geçmiş kaydı oluşturuyoruz.
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
      expression: buildExpression(
        displayFirst,
        selectedOperator,
        displaySecond,
        resultText,
      ),
    }

    setHistory((previousHistory) => [historyItem, ...previousHistory].slice(0, 10))
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

  // Hesapla butonuna basılınca çalışacak fonksiyon.
  const calculate = () => {
    const first = parseNumberInput(firstValue)
    const second = parseNumberInput(secondValue)

    // Geçersiz sayı kontrolü (ör. kullanıcı beklenmedik bir değer girdiyse).
    if (first === null || second === null) {
      const errorResult = 'Lütfen geçerli sayılar girin.'
      setResult(errorResult)
      addToHistoryByValues(firstValue, secondValue, operator, errorResult, true)
      return
    }

    // Seçilen operatörün kendi component dosyasındaki hesaplayıcıyı çağırıyoruz.
    const { resultText, isError } = operatorCalculators[operator](first, second)
    setResult(resultText)

    // Yeni işlemi geçmişe ekleyip sadece son 10 kaydı tutuyoruz.
    addToHistory(first, second, operator, resultText, isError)
  }

  // Formu başlangıç haline döndürmek için ayrı bir fonksiyon yazıyoruz.
  // Bu yaklaşım, "tek sorumluluk" prensibi açısından daha temizdir:
  // calculate sadece hesaplar, clearValues sadece temizler.
  const clearValues = () => {
    setFirstValue('')
    setSecondValue('')
    setOperator('+')
    setResult('0')
  }

  // Sadece geçmiş kayıtlarını temizlemek için ayrı bir fonksiyon.
  const clearHistory = () => {
    setHistory([])
  }

  // Geçmişten bir satıra tıklanınca ilgili verileri tekrar forma yüklüyoruz.
  const applyHistoryItem = (item: HistoryItem) => {
    setFirstValue(item.firstValue)
    setSecondValue(item.secondValue)
    setOperator(item.operator)
    setResult(item.result)
  }

  const secondInputPlaceholder = isDegreeOperator(operator)
    ? 'derece'
    : isRatioOperator(operator)
      ? 'oran'
      : '2. sayı'

  return (
    // Layout'u iki kolona ayırıyoruz: solda hesap makinesi, sağda işlem geçmişi.
    <div className="app-layout">
      {/* Uygulamanın hesaplama tarafı */}
      <main className="calculator">
        <h1>Mini Hesap Makinesi</h1>
        <p>Toplama, çıkarma, çarpma, bölme, üs, kök, yüzde ve binde</p>

        {/* İlk sayı, işlem ve ikinci sayı alanlarını tek satırda topluyoruz. */}
        <div className="inputs">
          <input
            type="text"
            inputMode="decimal"
            placeholder="1. sayı"
            value={firstValue}
            // Input değişince state'i güncelliyoruz (controlled input yapısı).
            onChange={(event) =>
              updateNumberInput(event.target.value, setFirstValue)
            }
          />
          <select
            aria-label="İşlem seç"
            value={operator}
            // Select string döndürdüğü için Operator tipine cast ediyoruz.
            onChange={(event) => setOperator(event.target.value as Operator)}
          >
            <OperatorOptions />
          </select>
          <input
            type="text"
            inputMode="decimal"
            placeholder={secondInputPlaceholder}
            value={secondValue}
            // İkinci sayı değeri değiştikçe state güncellenir.
            onChange={(event) =>
              updateNumberInput(event.target.value, setSecondValue)
            }
          />
        </div>

        {isDegreeOperator(operator) && (
          <p className="input-hint">Bu işlemde ikinci alan derece olarak kullanılır.</p>
        )}
        {isRatioOperator(operator) && (
          <p className="input-hint">Bu işlemde ikinci alan oran olarak kullanılır.</p>
        )}

        {/* İki aksiyonu birlikte göstermek için butonları bir grupta tutuyoruz. */}
        <div className="actions">
          {/* Buton tıklaması hesaplama fonksiyonunu tetikler. */}
          <button type="button" onClick={calculate}>
            Hesapla
          </button>

          {/* Temizle butonu tüm inputları ve sonucu varsayılan hale döndürür. */}
          <button type="button" className="secondary" onClick={clearValues}>
            Temizle
          </button>
        </div>

        {/* Sonuç alanı her hesaplamadan sonra state üzerinden otomatik güncellenir. */}
        <div className="result">
          <span>Sonuç:</span> {result}
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

        <div className="history-content">
          {history.length === 0 ? (
            <p className="empty-history">Henüz işlem yapılmadı.</p>
          ) : (
            <ol>
              {history.map((item, index) => (
                <li key={`${item.expression}-${index}`}>
                  <button
                    type="button"
                    className={`history-item ${item.isError ? 'error' : 'success'}`}
                    onClick={() => applyHistoryItem(item)}
                  >
                    {item.expression}
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>
    </div>
  )
}

export default App
