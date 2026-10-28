# Converts a stylesheet to the light/dark theme tokens. Run with exec() and
# call sweep(css) -> (new_css, counts). Needs parse() from cssedit.py.
import re

GRAD = re.compile(r'linear-gradient\(180deg,\s*#e3d4f6[^;]*?\)(?=\s*;)')

def sweep(css):
    counts = {}
    def bump(k, n=1):
        counts[k] = counts.get(k, 0) + n

    css, n = GRAD.subn('var(--hero-gradient)', css); bump('gradient', n)

    # navy used as a BACKGROUND stays dark in both themes; its text stays white
    for r in sorted(parse(css), key=lambda r: -r['bs']):
        body = css[r['bs']:r['be']]
        if re.search(r'background(-color)?:\s*var\(--navy\)', body):
            nb = re.sub(r'(background(?:-color)?:\s*)var\(--navy\)', r'\1var(--navy-solid)', body)
            nb = re.sub(r'color:\s*var\(--white\)', 'color: #fff', nb)
            css = css[:r['bs']] + nb + css[r['be']:]
            bump('navy-bg')

    # white text is always meant to be white (it sits on orange/navy)
    css, n = re.subn(r'(?<![-\w])color:\s*var\(--white\)', 'color: #fff', css); bump('white-text', n)
    # plain white surfaces follow the theme
    css, n = re.subn(r'(background(?:-color)?:\s*)(#fff\b|#ffffff\b|white\b)(?=\s*[;\n])', r'\1var(--white)', css); bump('white-bg', n)
    css, n = re.subn(r'(background(?:-color)?:\s*)var\(--white\)\s*\n(\s+url)', r'\1var(--white)\n\2', css)
    css, n = re.subn(r'rgb\(255 255 255 / (70|72|75|88)%\)', 'var(--glass)', css); bump('glass', n)
    css, n = re.subn(r'#eef2f6', 'var(--sk-a)', css); bump('skeleton', n)
    css, n = re.subn(r'#f7f9fb', 'var(--sk-b)', css)
    css, n = re.subn(r'#c9d2dd', 'var(--line-strong)', css); bump('line-strong', n)
    return css, counts
