// فهرس «اللوح المحاور»: المراحل والصفوف والفروع والكتب.
// status: 'ready' كتاب منشور له رابط، 'soon' قيد الإعداد.
// draft: true يعني أن قائمة الكتب في هذا الصف مسودة تنتظر تأكيد البروفيسور عماد من طبعة 2026.
// exit: true صف منتهٍ يختم بامتحان وزاري.

const GH = 'https://imadmfas.github.io/';

// ألوان المواد وعلاماتها على الأغلفة المؤقتة
export const SUBJECTS = {
  reading:   { name: 'القراءة',             color: '#e5484d', mark: 'ق' },
  arabic:    { name: 'اللغة العربية',        color: '#d9480f', mark: 'ع' },
  grammar:   { name: 'قواعد اللغة العربية',  color: '#c2410c', mark: 'ن' },
  islamic:   { name: 'التربية الإسلامية',    color: '#2b8a3e', mark: 'إ' },
  math:      { name: 'الرياضيات',            color: '#1971c2', mark: '∑' },
  science:   { name: 'العلوم',               color: '#0c8599', mark: '⚗' },
  english:   { name: 'اللغة الإنكليزية',     color: '#7048e8', mark: 'E' },
  ethics:    { name: 'التربية الأخلاقية',    color: '#e8590c', mark: '♥' },
  social:    { name: 'الاجتماعيات',          color: '#a0522d', mark: '◍' },
  physics:   { name: 'الفيزياء',             color: '#364fc7', mark: 'ف' },
  chemistry: { name: 'الكيمياء',             color: '#087f5b', mark: 'ك' },
  biology:   { name: 'الأحياء',              color: '#5c940d', mark: 'ح' },
  computer:  { name: 'الحاسوب',              color: '#495057', mark: '⌘' },
  history:   { name: 'التاريخ',              color: '#9c6644', mark: 'ت' },
  geography: { name: 'الجغرافية',            color: '#1098ad', mark: 'ج' },
  economics: { name: 'الاقتصاد',             color: '#ae3ec9', mark: 'ص' },
};

const b = (subject, extra = {}) => ({ subject, status: 'soon', ...extra });

export const STAGES = [
  {
    id: 'primary', name: 'الابتدائية', mark: 'ب', years: 'ستة صفوف', color: '#f59f00', style: 'play',
    grades: [
      { id: 'p1', name: 'الأول الابتدائي', books: [
        b('reading',  { title: 'قراءتي الجديدة', status: 'ready', url: GH + 'imadgrade1/reading/' }),
        b('math',     { status: 'ready', url: GH + 'imadgrade1/math/' }),
        b('science',  { status: 'ready', url: GH + 'imadgrade1/science/' }),
        b('islamic',  { status: 'ready', url: GH + 'imadgrade1/islamic/' }),
        b('english',  { status: 'ready', url: GH + 'imadgrade1/english/' }),
        b('ethics',   { status: 'ready', url: GH + 'imadgrade1/ethics/' }),
      ], shelf: GH + 'imadgrade1/' },
      { id: 'p2', name: 'الثاني الابتدائي', draft: true, books: ['reading', 'math', 'science', 'islamic', 'english', 'ethics'].map((s) => b(s)) },
      { id: 'p3', name: 'الثالث الابتدائي', draft: true, books: ['reading', 'math', 'science', 'islamic', 'english', 'ethics'].map((s) => b(s)) },
      { id: 'p4', name: 'الرابع الابتدائي', draft: true, books: ['reading', 'math', 'science', 'islamic', 'english', 'social'].map((s) => b(s)) },
      { id: 'p5', name: 'الخامس الابتدائي', draft: true, books: ['reading', 'math', 'science', 'islamic', 'english', 'social'].map((s) => b(s)) },
      { id: 'p6', name: 'السادس الابتدائي', draft: true, exit: true, style: 'study', books: ['arabic', 'math', 'science', 'islamic', 'english', 'social'].map((s) => b(s)) },
    ],
  },
  {
    id: 'middle', name: 'المتوسطة', mark: 'م', years: 'ثلاثة صفوف', color: '#1c7ed6', style: 'study',
    grades: [
      { id: 'm1', name: 'الأول المتوسط', draft: true, books: ['arabic', 'islamic', 'english', 'math', 'physics', 'chemistry', 'biology', 'social', 'computer'].map((s) => b(s)) },
      { id: 'm2', name: 'الثاني المتوسط', draft: true, books: ['arabic', 'islamic', 'english', 'math', 'physics', 'chemistry', 'biology', 'social', 'computer'].map((s) => b(s)) },
      { id: 'm3', name: 'الثالث المتوسط', draft: true, exit: true, books: ['arabic', 'islamic', 'english', 'math', 'physics', 'chemistry', 'biology', 'social'].map((s) => b(s)) },
    ],
  },
  {
    id: 'secondary', name: 'الإعدادية', mark: 'ع', years: 'ثلاثة صفوف بفرعين', color: '#7048e8', style: 'study',
    grades: [
      { id: 's4', name: 'الرابع الإعدادي', branches: {
        sci: { draft: true, books: ['arabic', 'islamic', 'english', 'math', 'physics', 'chemistry', 'biology', 'computer'].map((s) => b(s)) },
        lit: { draft: true, books: ['arabic', 'islamic', 'english', 'math', 'history', 'geography', 'economics'].map((s) => b(s)) },
      } },
      { id: 's5', name: 'الخامس الإعدادي', branches: {
        sci: { draft: true, books: [
          b('arabic'), b('islamic'), b('english'), b('math'),
          b('physics',   { title: 'الفيزياء المنبثقة', status: 'ready', url: GH + 'physics5/' }),
          b('chemistry', { title: 'الكيمياء المنبثقة', status: 'ready', url: GH + 'chemistry5/' }),
          b('biology'),
        ] },
        lit: { draft: true, books: ['arabic', 'islamic', 'english', 'math', 'history', 'geography', 'economics'].map((s) => b(s)) },
      } },
      { id: 's6', name: 'السادس الإعدادي', exit: true, branches: {
        sci: { draft: true, books: [
          b('grammar', { title: 'أساسيات القواعد', status: 'ready', url: GH + 'arabic6grade/' }),
          b('physics', { title: 'مختبر الفيزياء', status: 'ready', url: GH + 'physics6/' }),
          b('chemistry', { title: 'مختبر الكيمياء', status: 'ready', url: GH + 'chemistry6/' }),
          b('biology', { title: 'مختبر الأحياء', status: 'ready', url: GH + 'biology6/' }),
          b('arabic'), b('islamic'), b('english'), b('math'),
        ] },
        lit: { draft: true, books: [
          b('grammar', { title: 'أساسيات القواعد', status: 'ready', url: GH + 'arabic6grade/' }),
          b('arabic'), b('islamic'), b('english'), b('math'), b('history'), b('geography'), b('economics'),
        ] },
      } },
    ],
  },
];

export const BRANCHES = { sci: 'العلمي', lit: 'الأدبي' };

// مفاتيح تقدّم كتب الصف الأول في «مكتبتي الملوّنة» (النطاق نفسه imadmfas.github.io فيُقرأ التخزين المشترك)
export const GRADE1_PROGRESS_KEYS = ['reading', 'math', 'science', 'islamic', 'english', 'ethics'].map((k) => 'kg-prog-' + k);

export const WHATSAPP = '9647812346562';
