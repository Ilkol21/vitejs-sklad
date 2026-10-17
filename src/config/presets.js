// Каталог майна, яке можна додати на позицію.
//
// kit: S/N вручну (кожен Старлінк додається окремо); serialPrefix: S/N завжди починається з цього префікса, він уже вписаний у полі;
// extra: необов'язкова додаткова позиція з кількістю (роутер до Старлінка, павук до рації), зберігається окремим записом
// variants: список видів (обов'язковий вибір); freeName: вільна назва; needsSerial: серійний номер (noBrand: без марки);
// hasModel: окреме поле «Модель» (brandLabel: підпис поля марки/назви); в Excel назва і модель йдуть в одну колонку «Марка»
// callsign: необов'язкове ім'я дрона (у назві пишеться в лапках, напр. Mavic 4 Pro "Панда")
// presence: без підрахунку, лише «Є / Немає» (у базі 1 або 0)
// presenceOrCount: комбінований облік: кожен рядок або «просто є» (колонка no_count = true), або з кількістю
// unit: одиниця виміру ('л'; за замовчуванням шт.); lengthM: довжина одного відрізка в метрах + кількість відрізків

export const PRESET_ITEMS = [
  { name: 'Старлінк', category: 'Зв\'язок', kit: true, serialPrefix: 'KIT', extra: { name: 'Роутер Старлінк', label: 'Роутер', plural: 'роутерів' }, variantLabel: 'версію', variants: ['Міні', '2 версія', '3 версія'] },
  { name: 'Генератор', category: 'Живлення' },
  { name: 'Зарядні станції (EcoFlow)', category: 'Живлення', needsSerial: true },
  { name: 'Рація', category: 'Зв\'язок', needsSerial: true, extra: { name: 'Павук', label: 'Павук', plural: 'павуків' } },
  { name: 'Камера спостереження', category: 'Зв\'язок' },
  { name: 'Антена', category: 'Зв\'язок', freeName: true },
  { name: 'Репітор', category: 'Зв\'язок' },
  { name: 'Зарядні хаби', category: 'Живлення', variants: ['Для Матріс', 'Для 4 Pro', 'Для 3 серії'] },
  { name: 'Спарки', category: 'Живлення', variants: ['Tulip', 'Для Аутель', 'До Матріс 5S', 'Звичайна 5S', 'Справа 4S'] },
  { name: 'Зарядка "5S"', category: 'Живлення' },
  { name: 'Кабель RG8', category: 'Зв\'язок', lengthM: true },
  { name: 'ОЗМ', category: 'Боєприпаси' },
  { name: 'Кірка', category: 'Інструменти' },
  { name: 'Лопати', category: 'Інструменти' },
  { name: 'Газовий балон', category: 'Витратні матеріали' },
  { name: 'Бур', category: 'Живлення' },
  { name: 'Протигази', category: 'Спорядження' },
  { name: 'Вогнегасники', category: 'Спорядження' },
  { name: 'Пульти до дронів', category: 'БПЛА', variants: ['Для 4 Pro', 'Для Матріс', 'Для Outel', 'Для 3 серії'] },
  { name: 'Батарейки до дронів', category: 'БПЛА', variants: ['Аутель', 'Мавік 3', 'Матріс', 'Matrice шиті', 'Matrice не шиті', 'Мавік 4 Pro'] },
  { name: 'Планшети', category: 'БПЛА', needsSerial: true, hasModel: true, brandLabel: 'Назва пристрою' },
  { name: 'Дрони', category: 'БПЛА', callsign: true, variantLabel: 'модель дрона', variants: ['Mavic 3 Pro', 'Mavic 3T', 'Mavic 3TA', 'Mavic 4 Pro', 'Matrice 4T', 'Outel', 'Matrice 4e'] },
  { name: 'Перехідники', category: 'Інше', variants: ['Для 3 серії', 'Для 4 Pro', 'Для Outel'] },
  { name: 'БК', category: 'Боєприпаси', variants: ['ВОГ-17', 'Патрони 5.56', 'Патрони 5.45'] },
  { name: 'Скиди', category: 'БПЛА', variants: ['Одинарний', 'Подвійний', 'Для 4 Pro', 'Для Матріс'] },
  { name: 'Рупор', category: 'Зв\'язок', variants: ['Для 3 серії', 'Для 4 Pro', 'Для Матріс'] },
  { name: 'Зарядка до рації', category: 'Зв\'язок', needsSerial: true, noBrand: true },
  { name: 'Маск-сітка', category: 'Спорядження' },
  { name: 'Сокира', category: 'Інструменти' },
  { name: 'Степлери', category: 'Інструменти' },
  { name: 'Цвяхи', category: 'Витратні матеріали' },
  { name: 'Переноски', category: 'Живлення', variants: ['Велика на котушці', 'Мала'] },
  { name: 'Зіп до генератора', category: 'Живлення' },
  { name: 'Трійники', category: 'Живлення' },
  { name: 'Світло', category: 'Живлення', presence: true },
  { name: 'Лопасті', category: 'БПЛА', variantLabel: 'модель', variants: ['Mavic 4 Pro', 'Matrice', 'Outel'], presenceOrCount: true },
  { name: 'Стяжки', category: 'Витратні матеріали', presence: true },
  { name: 'Ізолента', category: 'Витратні матеріали' },
  { name: 'Сітка від ФПВ', category: 'Спорядження' },
  { name: 'Спальники', category: 'Спорядження' },
  { name: 'Каримати', category: 'Спорядження' },
  { name: 'Мішки', category: 'Витратні матеріали' },
  { name: 'Грілка', category: 'Спорядження' },
  { name: 'Паяльник', category: 'Спорядження' },
  { name: 'Мультиметр', category: 'Інструменти' },
  { name: 'Жужик для ОЗМ', category: 'Боєприпаси' },
  { name: 'Датчик газу', category: 'Спорядження' },
  { name: 'Бензин', category: 'Витратні матеріали', unit: 'л' },
  { name: 'Масло', category: 'Витратні матеріали', unit: 'л' },
  { name: 'Розпорки для дронів', category: 'БПЛА', presence: true },
  { name: 'Кріплення на спарку', category: 'Інше', presence: true },
  { name: 'Ремінь на кріплення', category: 'Інше', presence: true },
  { name: 'Посуд', category: 'Спорядження', presence: true },
  { name: 'Мультитул', category: 'Інструменти', presence: true },
  { name: 'Ніж', category: 'Інструменти' },
  { name: 'Шестигранні ключі', category: 'Інструменти' }
]
