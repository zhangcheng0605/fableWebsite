import re, json, base64, os, sys
from fontTools.ttLib import TTFont
from fontTools.merge import Merger
from fontTools.subset import Subsetter, Options
from fontTools.varLib import instancer

SRC = "/root/.claude/uploads/7bbe6a46-2a60-5cdf-8f74-575ea802f781/1eed2186-zacstudiosinklogo.html"
WEIGHT = 900
# every glyph assets/ink-array.js can draw: the particle pool, the formation
# names, and the Chinese numerals on the chips
POOL = '扎克工作室墨艺创匠心影光形意象美灵感造梦视觉设计韵神气风雅境妙巧思品质道法笔纸砚彩绘塑构'
UI   = '起式归一二三四五收壹贰叁肆伍陆\u00b7 '  # trailing: middle dot + space, the chip separators
need = sorted(set(POOL + UI))

s = open(SRC, encoding='utf-8').read()
tpl = json.loads(re.search(r'<script type="__bundler/template">(.*?)\n\s*</script>', s, re.S).group(1))
man = json.loads(re.search(r'<script type="__bundler/manifest">(.*?)\n\s*</script>', s, re.S).group(1))

faces = []
for b in re.findall(r'@font-face\s*\{(.*?)\}', tpl, re.S):
    fam = re.search(r"font-family:\s*'([^']+)'", b)
    wt  = re.search(r'font-weight:\s*(\d+)', b)
    src = re.search(r'url\("([^"]+)"\)', b)
    ur  = re.search(r'unicode-range:\s*([^;]+);', b)
    if fam and src and ur and fam.group(1) == 'Noto Serif SC' and int(wt.group(1)) == WEIGHT:
        faces.append((src.group(1), ur.group(1).strip()))

def parse_ur(ur):
    out = []
    for tok in ur.split(','):
        tok = tok.strip().replace('U+', '')
        if '-' in tok:
            a, b = tok.split('-'); out.append((int(a, 16), int(b, 16)))
        elif '?' in tok:
            out.append((int(tok.replace('?', '0'), 16), int(tok.replace('?', 'F'), 16)))
        else:
            a = int(tok, 16); out.append((a, a))
    return out

wanted, missing = {}, []
for ch in need:
    cp = ord(ch)
    for uuid, ur in faces:
        if any(a <= cp <= b for a, b in parse_ur(ur)):
            wanted.setdefault(uuid, []).append(ch); break
    else:
        missing.append(ch)
if missing:
    sys.exit('no source subset covers: ' + ''.join(missing))
print(f'{len(need)} glyphs across {len(wanted)} source subsets')

os.makedirs('build', exist_ok=True)
parts = []
for i, (uuid, chs) in enumerate(wanted.items()):
    raw = base64.b64decode(man[uuid]['data'])
    wp = f'build/{i}.woff2'; open(wp, 'wb').write(raw)
    f = TTFont(wp); f.flavor = None
    if 'fvar' in f:                      # these ship variable; pin the axis
        f = instancer.instantiateVariableFont(f, {'wght': WEIGHT}, inplace=False, updateFontNames=False)
    for t in ['BASE', 'vhea', 'vmtx']:   # BASE carries the VarStore that blocks merge
        if t in f: del f[t]
    o = Options(); o.drop_tables += ['GSUB','GPOS','GDEF','STAT','HVAR','VVAR','MVAR','avar','fvar','gvar','cvar']
    o.name_IDs = ['*']; o.notdef_outline = True
    ss = Subsetter(options=o); ss.populate(text=''.join(chs)); ss.subset(f)
    pp = f'build/{i}-cut.ttf'; f.save(pp); parts.append(pp)

merged = Merger().merge(parts)
o = Options(); o.drop_tables += ['GSUB','GPOS','GDEF','BASE']; o.name_IDs = ['*']; o.notdef_outline = True
ss = Subsetter(options=o); ss.populate(text=''.join(need)); ss.subset(merged)
merged.flavor = 'woff2'
merged.save('zacink.woff2')

have = set(merged.getBestCmap())
gone = [c for c in need if ord(c) not in have]
print('tables:', sorted(t for t in merged.keys() if t != 'GlyphOrder'))
print(f"zacink.woff2  {os.path.getsize('zacink.woff2')/1024:.1f} KB  glyphs={len(have)}  missing={''.join(gone) or 'none'}")
TTFont('zacink.woff2')   # reopen as a sanity check
