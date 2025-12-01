# FeelFree AI CLI

[![npm version](https://img.shields.io/npm/v/feelfreeai-cli.svg)](https://www.npmjs.com/package/feelfreeai-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-85%25%20passing-brightgreen)](https://github.com/dhsgud/feelfreeai-cli)

**?œêµ­??ì¹œí™”??AI ì½”ë”© ?´ì‹œ?¤í„´??* - llama.cpp?€ Geminië¥?ì§€?í•˜??ê°•ë ¥??CLI ?„êµ¬

## ??ì£¼ìš” ê¸°ëŠ¥

- ?¤– **?¤ì¤‘ LLM ì§€??*: llama.cpp (ë¡œì»¬) ë°?Gemini API
- ?‡°?‡· **?„ë²½???œêµ­??ì§€??*: ëª¨ë“  UI?€ ?‘ë‹µ???œêµ­?´ë¡œ ?œê³µ
- ?’¬ **?€?”í˜• REPL**: ?ì—°?¤ëŸ¬???€???¸í„°?˜ì´??
- ?“ **?Œì¼ ì»¨í…?¤íŠ¸**: `@filename` ?¼ë¡œ ?Œì¼ ì§ì ‘ ì°¸ì¡° ê°€??
- ??**ëª…ë ¹ ?¤í–‰**: `!command` ë¡???ëª…ë ¹???¤í–‰ ë°?ë¶„ì„
- ?’¾ **?¸ì…˜ ê´€ë¦?*: ?€???€??ë¡œë“œ ê¸°ëŠ¥
- ?”’ **?ˆì „???¤í–‰**: ?„í—˜ ëª…ë ¹???ë™ ì°¨ë‹¨
- ?¨ **?¤íŠ¸ë¦¬ë° ?‘ë‹µ**: ?¤ì‹œê°??‘ë‹µ ?œì‹œ

## ?“¦ ?¤ì¹˜

```bash
npm install -g feelfreeai-cli
```

## ?? ë¹ ë¥¸ ?œì‘

### 1. ì´ˆê¸° ?¤ì •

```bash
feelfree init
```

?€?”í˜• ?¤ì • ë§ˆë²•?¬ê? ?¤ìŒ???ˆë‚´?©ë‹ˆ??
- LLM ?„ë¡œë°”ì´??? íƒ (llama.cpp ?ëŠ” Gemini)
- API ???¤ì • (Gemini ?¬ìš© ??
- ?œë²„ ?”ë“œ?¬ì¸???¤ì • (llama.cpp ?¬ìš© ??
- ëª¨ë¸ ?¤ì •

### 2. ?€???œì‘

#### REPL ëª¨ë“œ (ê¶Œì¥)

```bash
feelfree
```

?€?”í˜• ?¸í„°?˜ì´?¤ì—??
- ?ì—°?¤ëŸ½ê²?ì§ˆë¬¸?˜ê¸°
- `@?Œì¼ëª? ?¼ë¡œ ?Œì¼ ì°¸ì¡°
- `!ëª…ë ¹?? ë¡???ëª…ë ¹ ?¤í–‰
- `/help` ë¡??¬ìš© ê°€?¥í•œ ëª…ë ¹???•ì¸

#### ?¨ì¼ ì§ˆë¬¸ ëª¨ë“œ

```bash
feelfree -q "???„ë¡œ?íŠ¸??êµ¬ì¡°ë¥?ë¶„ì„?´ì¤˜"
```

#### ?Œì¼ ì»¨í…?¤íŠ¸?€ ?¨ê»˜

```bash
feelfree -q "??ì½”ë“œë¥?ë¦¬ë·°?´ì¤˜" -f src/main.ts -f tests/main.test.ts
```

## ?“– ?¬ìš© ?ˆì œ

### ?Œì¼ ì°¸ì¡°?˜ê¸°

```
You: @README.md ???„ë¡œ?íŠ¸ê°€ ë­í•˜??ê±°ì•¼?
```

### ëª…ë ¹ ?¤í–‰?˜ê¸°

```
You: !npm test
You: ???ŒìŠ¤??ê²°ê³¼ë¥?ë¶„ì„?´ì¤˜
```

### ?¸ì…˜ ?€??ë¡œë“œ

```
You: /save my-session
You: /sessions
You: /load my-session
```

### ë©€?°íŒŒ??ë¶„ì„

```
You: @src/index.ts @src/config.ts ???Œì¼??ê´€ê³„ë? ?¤ëª…?´ì¤˜
```

## ?’¡ REPL ëª…ë ¹??

| ëª…ë ¹??| ?¤ëª… |
|--------|------|
| `/help` | ?„ì?ë§??œì‹œ |
| `/clear` | ?€??ê¸°ë¡ ì´ˆê¸°??|
| `/save [?´ë¦„]` | ?„ì¬ ?¸ì…˜ ?€??|
| `/load [?´ë¦„]` | ?¸ì…˜ ë¶ˆëŸ¬?¤ê¸° |
| `/sessions` | ?€?¥ëœ ?¸ì…˜ ëª©ë¡ |
| `/files` | ë¡œë“œ???Œì¼ ëª©ë¡ |
| `/context` | ì»¨í…?¤íŠ¸ ì´ˆê¸°??|
| `/exit` | ì¢…ë£Œ |

## ?™ï¸ ?¤ì •

### ?„ì—­ ?¤ì •

?¤ì • ?Œì¼ ?„ì¹˜: `~/.config/feelfreeai/config.json`

```json
{
  "defaultProvider": "gemini",
  "providers": {
    "gemini": {
      "type": "gemini",
      "apiKey": "YOUR_API_KEY",
      "model": "gemini-pro",
      "temperature": 0.7
    },
    "llamacpp": {
      "type": "llamacpp",
      "endpoint": "http://localhost:8080",
      "model": "llama-3-8b",
      "temperature": 0.7
    }
  },
  "language": "ko",
  "streaming": true
}
```

### ?„ë¡œ?íŠ¸ë³??¤ì •

?„ë¡œ?íŠ¸ ë£¨íŠ¸??`FEELFREE.md` ?Œì¼ ?ì„±:

```markdown
# ?„ë¡œ?íŠ¸ ?´ë¦„

???„ë¡œ?íŠ¸??TypeScriptë¡??‘ì„±????? í”Œë¦¬ì??´ì…˜?…ë‹ˆ??

## ì»¨í…?¤íŠ¸
- React?€ Node.js ?¬ìš©
- Express ë°±ì—”??
- PostgreSQL ?°ì´?°ë² ?´ìŠ¤

## ì»¤ìŠ¤?€ ì§€ì¹?
- ì½”ë“œ????ƒ TypeScriptë¡??‘ì„±
- ESLint ê·œì¹™ ì¤€??
- Jestë¡??ŒìŠ¤???‘ì„±
```

## ?”§ CLI ?µì…˜

```bash
feelfree [options] [command]

Commands:
  init                 ?¤ì • ë§ˆë²•???œì‘
  login                API ???¤ì •
  update               ?¤ì • ?…ë°?´íŠ¸

Options:
  -q, --query <text>   ?¨ì¼ ì§ˆë¬¸
  -f, --file <path>    ?Œì¼ ì»¨í…?¤íŠ¸ ì¶”ê?
  -p, --prompt <text>  ì»¤ìŠ¤?€ ?œìŠ¤???„ë¡¬?„íŠ¸
  -m, --model <name>   ?¬ìš©??ëª¨ë¸
  --no-stream          ?¤íŠ¸ë¦¬ë° ë¹„í™œ?±í™”
  -v, --version        ë²„ì „ ?œì‹œ
  -h, --help           ?„ì?ë§??œì‹œ
```

## ?§ª ?ŒìŠ¤??

```bash
# ëª¨ë“  ?ŒìŠ¤???¤í–‰
npm test

# ?¨ìœ„ ?ŒìŠ¤?¸ë§Œ
npm run test:unit

# ì»¤ë²„ë¦¬ì? ë¦¬í¬??
npm run test:coverage

# Watch ëª¨ë“œ
npm test -- --watch
```

**?„ì¬ ?ŒìŠ¤???íƒœ**: 70/82 ?ŒìŠ¤???µê³¼ (85.4%)

## ?¤ ê¸°ì—¬?˜ê¸°

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### ê°œë°œ ?˜ê²½ ?¤ì •

```bash
# ?€?¥ì†Œ ?´ë¡ 
git clone https://github.com/dhsgud/feelfreeai-cli.git
cd feelfreeai-cli

# ?˜ì¡´???¤ì¹˜
npm install

# ë¹Œë“œ
npm run build

# ê°œë°œ ëª¨ë“œ (watch)
npm run dev

# ë¦°íŠ¸
npm run lint
npm run lint:fix

# ?¬ë§·??
npm run format
```

## ?“‹ ?”êµ¬?¬í•­

- Node.js >= 18.0.0
- npm >= 8.0.0

### LLM ?„ë¡œë°”ì´??

**Gemini ?¬ìš© ??*:
- Google AI Studio API ??([ë°œê¸‰ ë°›ê¸°](https://makersuite.google.com/app/apikey))

**llama.cpp ?¬ìš© ??*:
- ë¡œì»¬?ì„œ ?¤í–‰ ì¤‘ì¸ llama.cpp ?œë²„
- ê¸°ë³¸ ?”ë“œ?¬ì¸?? `http://localhost:8080`

## ?›¡ï¸?ë³´ì•ˆ

- API ?¤ëŠ” ë¡œì»¬???ˆì „?˜ê²Œ ?€?¥ë©?ˆë‹¤
- ?„í—˜??ëª…ë ¹???ë™ ì°¨ë‹¨ (`rm -rf /`, fork bomb ??
- ì£¼ì˜ ?„ìš” ëª…ë ¹?´ëŠ” ?¬ìš©???•ì¸ ?”ì²­

## ?“„ ?¼ì´? ìŠ¤

MIT License - ?ìœ ë¡?²Œ ?¬ìš©?˜ì„¸??

## ?™ ê°ì‚¬

- [llama.cpp](https://github.com/ggerganov/llama.cpp) - ë¡œì»¬ LLM ?¤í–‰
- [Google Gemini](https://deepmind.google/technologies/gemini/) - ê°•ë ¥??AI ëª¨ë¸
- [Commander.js](https://github.com/tj/commander.js/) - CLI ?„ë ˆ?„ì›Œ??
- [Inquirer.js](https://github.com/SBoudrias/Inquirer.js/) - ?€?”í˜• ?„ë¡¬?„íŠ¸

## ?› ë²„ê·¸ ë¦¬í¬??

?´ìŠˆê°€ ?ˆìœ¼?œë©´ [GitHub Issues](https://github.com/dhsgud/feelfreeai-cli/issues)???±ë¡?´ì£¼?¸ìš”.

## ?“ ?°ë½ì²?

- GitHub: [@dhsgud](https://github.com/dhsgud)
- Email: your.email@example.com

---

**Made with ?¤ï¸ for Korean Developers**
