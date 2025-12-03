# FeelFree AI - VS Code Extension

> AI 코딩 어시스턴트를 VS Code 안에서 바로 사용하세요!

## 기능

### 💬 사이드바 채팅
- AI와 실시간 대화
- 스트리밍 응답 지원
- 대화 이력 관리

### ⚡ 명령어
- **Explain Code**: 선택한 코드를 자세히 설명
- **Refactor Code**: 코드 리팩토링 제안
- **Generate Tests**: 단위 테스트 자동 생성
- **Ask Question**: AI에게 질문하기 (코드 컨텍스트 포함 가능)

## 설치

VS Code Marketplace에서 "FeelFree AI"를 검색하거나:

```bash
code --install-extension feelfreeai.feelfreeai-vscode
```

## 설정

VS Code 설정에서 구성 가능:

1. **AI 프로바이더 선택**
   - Gemini (기본)
   - llama.cpp (로컬 실행)

2. **API 키 설정** (Gemini 사용 시)
   - Settings → Extensions → FeelFree AI → Gemini API Key

3. **llama.cpp 엔드포인트** (llama.cpp 사용 시)
   - Settings → Extensions → FeelFree AI → Llamacpp Endpoint
   - 기본값: `http://localhost:8080`

## 사용법

### 채팅 시작

1. 왼쪽 Activity Bar에서 FeelFree AI 아이콘 클릭
2. 또는 `Ctrl+Shift+P` → "FeelFree AI: Open Chat"

### 코드 설명

1. 코드 선택
2. `Ctrl+Shift+P` → "FeelFree AI: Explain Code"
3. 채팅 패널에 자동으로 질문 전송

### 코드 리팩토링

1. 리팩토링할 코드 선택
2. `Ctrl+Shift+P` → "FeelFree AI: Refactor Code"

### 테스트 생성

1. 함수 또는 클래스 코드 선택
2. `Ctrl+Shift+P` → "FeelFree AI: Generate Tests"

## 요구사항

- VS Code 1.85.0 이상
- Gemini API 키 또는 로컬 llama.cpp 서버

## 개인정보 보호

- API 키는 로컬에만 저장됩니다
- 채팅 기록은 세션 종료 시 삭제됩니다
- 코드는 선택한 프로바이더로만 전송됩니다

## 라이선스

MIT License

## 지원

- 이슈: https://github.com/dhsgud/feelfreeai-vscode/issues
- 관련 CLI 도구: [feelfreeai-cli](https://www.npmjs.com/package/feelfreeai-cli)
