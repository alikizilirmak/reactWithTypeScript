import { useMemo, useState } from 'react'
import './App.css'

// Sadece bu 4 işlem desteklensin diye bir union type tanımlıyoruz.
// Böylece yanlış bir operatör değerini TypeScript derleme aşamasında yakalar.
type Operator = '+' | '-' | '*' | '/'

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

  // Input değerlerini Number'a çeviriyoruz.
  // useMemo kullanmamızın nedeni: firstValue / secondValue değişmediği sürece
  // aynı dönüşüm sonucunu tekrar üretmemek.
  const parsedValues = useMemo(
    () => ({
      first: Number(firstValue),
      second: Number(secondValue),
    }),
    [firstValue, secondValue],
  )

  // Hesapla butonuna basılınca çalışacak fonksiyon.
  const calculate = () => {
    const { first, second } = parsedValues

    // Geçersiz sayı kontrolü (ör. kullanıcı beklenmedik bir değer girdiyse).
    if (Number.isNaN(first) || Number.isNaN(second)) {
      setResult('Lütfen geçerli bir sayı girin.')
      return
    }

    // Matematiksel olarak tanımsız durum: 0'a bölme.
    if (operator === '/' && second === 0) {
      setResult('0 ile bölme yapılamaz.')
      return
    }

    // Hesaplama sonucu bu değişkende tutulacak.
    let calculation = 0

    // Seçilen operatöre göre ilgili işlemi yapıyoruz.
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

    // Sayısal sonucu string'e çevirip ekrana yansıtıyoruz.
    setResult(calculation.toString())
  }

  return (
    // Uygulamanın ana kapsayıcısı.
    <main className="calculator">
      <h1>Mini Hesap Makinesi</h1>
      <p>Toplama, çıkarma, çarpma ve bölme</p>

      {/* İlk sayı, işlem ve ikinci sayı alanlarını tek satırda topluyoruz. */}
      <div className="inputs">
        <input
          type="number"
          placeholder="1. sayı"
          value={firstValue}
          // Input değişince state'i güncelliyoruz (controlled input yapısı).
          onChange={(event) => setFirstValue(event.target.value)}
        />
        <select
          aria-label="İşlem seç"
          value={operator}
          // Select string döndürdüğü için Operator tipine cast ediyoruz.
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
          // İkinci sayı değeri değiştikçe state güncellenir.
          onChange={(event) => setSecondValue(event.target.value)}
        />
      </div>

      {/* Buton tıklaması hesaplama fonksiyonunu tetikler. */}
      <button type="button" onClick={calculate}>
        Hesapla
      </button>

      {/* Sonuç alanı her hesaplamadan sonra state üzerinden otomatik güncellenir. */}
      <div className="result">
        <span>Sonuç:</span> {result}
      </div>
    </main>
  )
}

export default App
