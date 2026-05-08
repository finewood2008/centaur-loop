# Security Policy

Centaur Loop is an early-stage open-source project. Please do not open public issues for security-sensitive findings.

## Reporting

If you find a vulnerability, open a private GitHub security advisory for this repository or contact the maintainer through the repository owner profile.

Please include:

- A clear description of the issue.
- Reproduction steps or proof of concept.
- Impact and affected versions or commits.
- Any suggested mitigation.

## Runtime Secrets

Centaur Loop's real model path is designed so API keys stay in local environment variables and are only used by the local Vite proxy. Do not place API keys in frontend code, committed files, screenshots, or public issues.
