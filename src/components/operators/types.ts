// Uygulamanın tanıdığı tüm operatörleri tek yerde tutuyoruz.
// Yeni bir operatör eklerken burada da tip olarak eklemek gerekir.
export type Operator =
  | '+'
  | '-'
  | '*'
  | '/'
  | '^'
  | '√'
  | '%'
  | '‰'
  | 'log'
  | 'ln'
  | 'x²'
  | '1/x'
  | '|x|'
  | 'x!'
  | 'mod'

// Her operatör hesaplama sonunda bu yapıyı döndürür:
// - resultText: kullanıcıya gösterilecek sonuç metni
// - isError: sonuç bir hata mesajı mı?
export type OperationResult = {
  resultText: string
  isError: boolean
}

// Operatör hesaplayıcıları bu fonksiyon imzasına uyar.
// Bu sayede App tarafı "hangi operatör olursa olsun" tek bir biçimde çağırabilir.
export type OperationCalculator = (
  first: number,
  second: number,
) => OperationResult

// Her operatör button component'i bu props ile çalışır.
// activeOperator sayesinde hangi operatörün seçili olduğunu görselde vurgulayabiliyoruz.
export type OperatorButtonProps = {
  onSelect: (operator: Operator) => void
  activeOperator: Operator | null
  showScientific?: boolean
}
