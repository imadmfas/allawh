#!/usr/bin/env python3
"""يفحص كل النصوص العربية في المصدر والملفات المبنية بحثاً عن التراكيب والكلمات الممنوعة.
يُزال التشكيل قبل الفحص. يخرج برمز 1 إذا وجد شيئاً."""
import re, sys, os, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TASH = re.compile('[ؐ-ًؚ-ٰٟۖ-ۭـ]')
WORDS = ['التراث', 'مجرد', 'بوصفه', 'بوصفها']
PAIRS = [('ليس', 'بل'), ('لا', 'بل'), ('ليست', 'بل'), ('لم يكن', 'بل'), ('لم تكن', 'بل'), ('ما كان', 'بل'), ('ليس المقصود', 'وإنما'), ('لا يعني', 'وإنما')]
files = [f for pat in ('*.html', '*.js', '*.md', 'data/*.js', 'data/*.json') for f in glob.glob(os.path.join(ROOT, pat))]
bad = 0
for f in files:
    txt = TASH.sub('', open(f, encoding='utf-8').read())
    for w in WORDS:
        for m in re.finditer(r'(?<![ء-ي])' + w, txt):
            print(f'{os.path.relpath(f, ROOT)}: كلمة ممنوعة «{w}»'); bad += 1
    # التراكيب: الطرف الأول ثم «بل/وإنما» في الجملة نفسها (حتى نقطة أو سطر جديد)
    for sent in re.split(r'[.\n؟!:؛]', txt):
        for a, b in PAIRS:
            ma = re.search(r'(?<![ء-ي])' + a + r'(?![ء-ي])', sent)
            if ma and re.search(r'(?<![ء-ي])' + b + r'(?![ء-ي])', sent[ma.end():]):
                print(f'{os.path.relpath(f, ROOT)}: تركيب ممنوع «{a}…{b}»: {sent.strip()[:80]}'); bad += 1
print('arabic lint:', 'clean' if not bad else f'{bad} issue(s)')
sys.exit(1 if bad else 0)
