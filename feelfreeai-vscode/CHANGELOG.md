# Changelog

## [1.0.0] - 2025-12-03

### 🎉 Major Release

#### 새로운 기능
- ✨ **@ 멘션 기능**: 파일을 참조하여 AI와 대화
  - `@` 입력 시 실시간 파일 검색 자동완성
  - 키보드 네비게이션 지원 (↑↓ Enter Esc)
  - 선택된 파일 내용이 자동으로 컨텍스트에 포함
  - 📎 Code Context Items 섹션에서 파일 관리
  - "+ 파일 추가" 버튼으로 직접 파일 선택 가능

#### 개선사항
- 🎨 완전히 재설계된 Chat UI
- 🚀 향상된 사용자 경험
- 💾 세션 히스토리 관리
- 📊 토큰 사용량 시각화
- 🎭 다중 Gemini 모델 선택 (1.5 Flash, 1.5 Pro, 2.0 Flash Preview)

#### 기술적 개선
- 완전히 재작성된 ChatViewProvider (1400+ 줄)
- 새로운 파일 검색 유틸리티 (`fileSearch.ts`)
- 모듈화된 코드 구조
- TypeScript 타입 안정성 향상

## [0.1.1] - 2025-12-03

### Fixed
- 🐛 Fixed infinite loading issue on extension activation
- ✅ Ensured proper initialization of AI provider
- 🔧 Improved error handling for provider setup

## [0.1.0] - 2025-12-03

### Added
- 🎉 Initial release
- 💬 Sidebar chat panel with AI
- 🔍 Explain Code command
- ✨ Refactor Code command
- 🧪 Generate Tests command
- 💭 Ask Question command
- 🌐 Gemini and llama.cpp provider support
- ⚡ Streaming response support
- 🎨 VS Code theme-aware UI

### Features
- Real-time AI conversation in sidebar
- Code context in commands
- Configurable AI provider (Gemini/llama.cpp)
- Korean language support
- Session management
