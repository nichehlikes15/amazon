import re

def parse(css):
    """Return rules (top-level and inside @media) with body offsets. Comments are blanked
    in a shadow copy so offsets stay identical to the real text."""
    shadow = re.sub(r'/\*.*?\*/', lambda m: ' ' * len(m.group(0)), css, flags=re.S)
    out = []
    stack = []
    sel_start = 0
    for i, c in enumerate(shadow):
        if c == '{':
            stack.append((shadow[sel_start:i].strip(), i))
            sel_start = i + 1
        elif c == '}':
            if stack:
                sel, oi = stack.pop()
                media = stack[-1][0] if stack else None
                if not sel.startswith('@'):
                    out.append(dict(sel=norm(sel), bs=oi + 1, be=i, media=norm(media) if media else None))
            sel_start = i + 1
        elif c == ';' and not stack:
            sel_start = i + 1
    return out

def norm(s):
    return re.sub(r'\s+', ' ', re.sub(r'\s*,\s*', ', ', s)).strip() if s else s

def set_props(css, selector, props, media=None, remove=()):
    """Set/replace declarations in rule(s) whose selector == selector (normalized). media=None -> top-level only; media='any' -> any."""
    rules = parse(css)
    target = norm(selector)
    def media_ok(r):
        if media == 'any': return True
        if media is None: return r['media'] is None
        return r['media'] is not None and norm(media) in r['media']
    hits = [r for r in rules if r['sel'] == target and media_ok(r)]
    if not hits:
        return css, 0
    for r in sorted(hits, key=lambda r: -r['bs']):
        body = css[r['bs']:r['be']]
        new = body
        for p in remove:
            new = re.sub(r'(^|[;{\s])\s*' + re.escape(p) + r'\s*:[^;]*;?', r'\1', new)
        for p, v in props.items():
            pat = re.compile(r'((?:^|[;\s]))(' + re.escape(p) + r')\s*:\s*[^;]*;')
            if pat.search(new):
                new = pat.sub(lambda m: m.group(1) + p + ': ' + v + ';', new, count=1)
                # remove duplicates of the same prop later in the body
                first = new.find(p + ': ' + v + ';') + len(p + ': ' + v + ';')
                new = new[:first] + pat.sub(r'\1', new[first:])
            else:
                indent = re.search(r'\n(\s+)\S', new)
                ind = indent.group(1) if indent else '    '
                stripped = new.rstrip()
                if stripped and not stripped.endswith(';') and not stripped.endswith('{'):
                    stripped += ';'
                new = stripped + '\n' + ind + p + ': ' + v + ';\n'
        # tidy blank lines left by removals
        new = re.sub(r'\n\s*\n(\s*\n)+', '\n', new)
        css = css[:r['bs']] + new + css[r['be']:]
    return css, len(hits)
