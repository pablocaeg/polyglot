# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Email **pablo@explorinder.com** or use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
3. Include steps to reproduce the issue
4. Allow reasonable time for a fix before public disclosure

## Scope

This project handles:

- User-generated prompts sent to the DeepSeek API
- IndexedDB data stored locally in the browser
- Optional PostgreSQL database with dictionary and text data
- API endpoints with rate limiting

## Known Considerations

- **API key**: The `DEEPSEEK_API_KEY` is server-side only and must never be exposed to the client. The Vite dev server middleware and Express server both keep it on the backend.
- **User input**: All user inputs sent to the LLM are length-limited and sanitized before forwarding to the API.
- **Rate limiting**: API endpoints are rate-limited to prevent abuse (20 req/min for AI endpoints, 120 req/min for DB endpoints).
