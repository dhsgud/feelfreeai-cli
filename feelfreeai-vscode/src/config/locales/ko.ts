/**
 * 한글 UI 문자열
 */
export const ko = {
    // 일반 메시지
    welcome: '🤖 FeelFree AI에 오신 것을 환영합니다!',
    goodbye: '👋 안녕히 가세요!',

    // CLI 프롬프트
    prompt: {
        input: '> ',
        multiline: '... ',
        confirm: '계속하시겠습니까?',
    },

    // 명령어
    commands: {
        help: '도움말',
        exit: '종료',
        clear: '대화 내용 지우기',
        save: '대화 저장',
        load: '대화 불러오기',
        init: '프로젝트 초기화',
        login: '로그인 설정',
    },

    // 도움말 메시지
    help: {
        title: '📚 사용 가능한 명령어',
        usage: '사용법',
        examples: '예시',
        slashCommands: '슬래시 명령어:',
        specialSyntax: '특수 문법:',
        fileReference: '@파일명 - 파일을 컨텍스트에 추가',
        bashCommand: '!명령어 - 셸 명령어 실행',
    },

    // 오류 메시지
    errors: {
        noProvider: '프로바이더를 찾을 수 없습니다.',
        noApiKey: 'API 키가 설정되지 않았습니다. "feelfree login" 명령어를 실행하세요.',
        connectionFailed: '서버 연결에 실패했습니다.',
        invalidCommand: '알 수 없는 명령어입니다.',
        fileNotFound: '파일을 찾을 수 없습니다: {path}',
        permissionDenied: '권한이 거부되었습니다: {tool}',
        timeout: '요청 시간이 초과되었습니다.',
        unknown: '알 수 없는 오류가 발생했습니다.',
    },

    // 상태 메시지
    status: {
        connecting: '연결 중...',
        thinking: '생각하는 중...',
        generating: '응답 생성 중...',
        executing: '실행 중...',
        saving: '저장 중...',
        loading: '불러오는 중...',
    },

    // 프로바이더 관련
    providers: {
        llamacpp: 'llama.cpp (로컬)',
        gemini: 'Gemini (클라우드)',
        switching: '프로바이더 전환: {provider}',
    },

    // 설정 관련
    config: {
        title: '⚙️  설정',
        selectProvider: '프로바이더를 선택하세요:',
        enterApiKey: 'API 키를 입력하세요:',
        enterEndpoint: '서버 엔드포인트를 입력하세요:',
        saved: '설정이 저장되었습니다.',
    },

    // 세션 관련
    session: {
        created: '새 대화가 시작되었습니다.',
        saved: '대화가 저장되었습니다: {name}',
        loaded: '대화를 불러왔습니다: {name}',
        notFound: '대화를 찾을 수 없습니다: {name}',
        cleared: '대화 내용이 지워졌습니다.',
    },

    // 도구 실행 관련
    tools: {
        readFile: '📄 파일 읽기: {path}',
        writeFile: '✏️  파일 쓰기: {path}',
        executeBash: '🔧 명령어 실행: {command}',
        requestPermission: '{tool} 권한이 필요합니다. 허용하시겠습니까?',
        permissionGranted: '{tool} 권한이 허용되었습니다.',
        permissionDenied: '{tool} 권한이 거부되었습니다.',
    },

    // 프로젝트 초기화
    init: {
        creating: 'FEELFREE.md 파일을 생성하는 중...',
        created: '✅ 프로젝트가 초기화되었습니다!',
        alreadyExists: 'FEELFREE.md 파일이 이미 존재합니다.',
    },
};

export type LocaleStrings = typeof ko;
