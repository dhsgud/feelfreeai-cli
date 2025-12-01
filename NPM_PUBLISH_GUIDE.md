# npm 배포 최종 단계

## ✅ 완료된 준비 작업

- [x] GitHub repository 설정 (https://github.com/dhsgud/feelfreeai-cli)
- [x] package.json 업데이트
- [x] README.md 업데이트
- [x] CHANGELOG.md 업데이트
- [x] CONTRIBUTING.md 업데이트
- [x] 빌드 검증
- [x] dry-run 테스트

## 🚀 이제 배포할 수 있습니다!

### 1단계: npm 로그인 (아직 안 했다면)
```bash
npm login
```

입력 사항:
- Username: (npm 사용자명)
- Password: (npm 비밀번호)
- Email: (npm 이메일)

### 2단계: 배포 실행
```bash
npm publish --access public
```

### 3단계: 배포 확인
```bash
# npm 사이트에서 확인
https://www.npmjs.com/package/feelfreeai-cli

# 설치 테스트
npm install -g feelfreeai-cli
feelfree --version
```

## 📦 배포될 파일 목록

다음 파일들이 npm에 배포됩니다:
- `dist/` - 빌드된 JavaScript 파일
- `README.md` - 문서
- `LICENSE` - MIT 라이선스
- `CHANGELOG.md` - 변경 로그
- `package.json` - 패키지 메타데이터

## 🔄 배포 후 작업

### GitHub에 코드 업로드
```bash
git init
git add .
git commit -m "feat: initial release v0.1.0"
git branch -M main
git remote add origin https://github.com/dhsgud/feelfreeai-cli.git
git push -u origin main

# 태그 생성
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

### GitHub Release 생성
1. https://github.com/dhsgud/feelfreeai-cli/releases
2. "Create a new release" 클릭
3. Tag: v0.1.0
4. Title: "v0.1.0: Initial Release"
5. Description: CHANGELOG.md 내용 복사

## ⚠️ 주의사항

- **첫 배포 시에는 `--access public` 필수**
- **배포 후에는 24시간 동안 삭제 불가**
- **버전 수정 시:**
  ```bash
  npm version patch  # 0.1.0 -> 0.1.1
  npm publish
  ```

## 🎉 배포 완료 후

사용자들이 다음과 같이 설치할 수 있습니다:
```bash
npm install -g feelfreeai-cli
feelfree --help
```

---

**준비 완료! `npm publish --access public` 명령어를 실행하세요!** 🚀
