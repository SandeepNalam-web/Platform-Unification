# Platform Unification — Automated Test Suite

End-to-end UI test automation for the **Interface.ai** platform using **Playwright** with a custom **Extent Reporter** that generates rich HTML reports and supports email delivery.

---

## Prerequisites

| Tool       | Version | Check command        |
|------------|---------|----------------------|
| **Node.js** | >= 18   | `node -v`           |
| **npm**     | >= 9    | `npm -v`            |
| **Git**     | any     | `git --version`     |

A Chromium-based browser is installed automatically by Playwright during setup.

---

## Compilation & Installation

> This is a JavaScript (ES Modules) project — there is no separate compilation step.
> Installing dependencies and Playwright browsers is all that is needed.

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd "Platform Unification/Platform Unification"
```

### 2. Install Node.js dependencies

```bash
npm install
```

This reads `package.json` and installs:

| Package | Purpose |
|---------|---------|
| `@playwright/test` | Test runner and browser automation |
| `xlsx` | Read test data from Excel files |
| `nodemailer` | Send HTML report emails |

### 3. Install Playwright browsers

```bash
npx playwright install --with-deps chromium
```

This downloads the Chromium browser binary that Playwright uses for test execution.

### Quick one-liner (install everything)

```bash
npm install && npx playwright install --with-deps chromium
```

---

## Project Structure

```
Platform Unification/
├── data/                        # Test data (Excel)
│   └── testData.xlsx
├── pages/                       # Page Object Models
│   ├── LoginPage.js
│   ├── SmartConversionAdvisory.js
│   ├── Platform.js
│   ├── PlatformSD.js
│   ├── KnowledgeManager.js
│   ├── AdminMockApi.js
│   └── InboxesApi.js
├── tests/
│   ├── fixtures/
│   │   └── persistent-shared.js # Shared browser context fixture
│   └── ui/
│       ├── 00-Login.spec.js
│       ├── 05-Platform.spec.js
│       ├── 06-PlatformSD.spec.js
│       ├── 07-KnowledgeManager.spec.js
│       └── 08-SmartConversionAdvisory.spec.js
├── reporters/
│   └── extent-reporter.js       # Custom HTML reporter + email
├── utils/
│   ├── excelReader.js           # Excel test data reader
│   └── SortHelper.js
├── scripts/                     # Advisory audit/debug utilities
│   ├── advisory-audit.mjs
│   ├── advisory-snapshot-dump.mjs
│   ├── advisory-nav-test.mjs
│   ├── advisory-explore-structure.mjs
│   └── advisory-debug-total-forms.mjs
├── auth/
│   └── storageState.json        # Saved auth state
├── playwright.config.js
├── package.json
└── .gitignore
```

---

## Running Tests

### Local (headed browser, data from Excel)

```bash
# Run Chat AI tests (Login + PlatformSD + KnowledgeManager + Advisory)
npm run test:chatai

# Run Voice AI tests (Login + Platform)
npm run test:voiceai

# Run all tests
npm test
```

The browser opens visibly and the Extent Report auto-opens in your default browser after completion.

### Local with environment overrides

You can override Excel values using environment variables without modifying the file:

```bash
# PowerShell
$env:CUNAME="MyBank"; $env:ENVNAME="QA"; npm run test:chatai

# Bash / macOS / Linux
CUNAME="MyBank" ENVNAME="QA" npm run test:chatai
```

---

## CI/CD (Jenkins)

### Environment Variables

| Variable | Source | Required | Description |
|---|---|---|---|
| `CI` | Jenkins (auto-set) | Auto | Enables headless mode, skips browser-open, enables email |
| `CUNAME` | Jenkins UI parameter | Yes | Credit Union name |
| `ENVNAME` | Jenkins UI parameter | Yes | Environment name |
| `REPORT_EMAIL` | Jenkins UI parameter | Yes | Comma-separated email recipients for the report |
| `SMTP_HOST` | Jenkins credentials | For email | SMTP server hostname |
| `SMTP_PORT` | Jenkins credentials | For email | SMTP port (default: 587) |
| `SMTP_USER` | Jenkins credentials | For email | SMTP authentication username |
| `SMTP_PASS` | Jenkins credentials | For email | SMTP authentication password |
| `SMTP_FROM` | Jenkins env | Optional | Sender email address (defaults to `SMTP_USER`) |

### Jenkinsfile

```groovy
pipeline {
    agent any

    parameters {
        string(name: 'CUNAME',       defaultValue: '', description: 'Credit Union name')
        string(name: 'ENVNAME',      defaultValue: '', description: 'Environment name')
        string(name: 'REPORT_EMAIL', defaultValue: '', description: 'Email to send the report to')
    }

    environment {
        CI         = 'true'
        SMTP_HOST  = 'smtp.yourcompany.com'
        SMTP_PORT  = '587'
        SMTP_USER  = credentials('smtp-user')
        SMTP_PASS  = credentials('smtp-pass')
        SMTP_FROM  = 'automation@interface.ai'
    }

    stages {
        stage('Install') {
            steps {
                dir('Platform Unification') {
                    sh 'npm ci'
                    sh 'npx playwright install --with-deps chromium'
                }
            }
        }

        stage('Run Tests') {
            steps {
                dir('Platform Unification') {
                    sh """
                        CUNAME="${params.CUNAME}" \
                        ENVNAME="${params.ENVNAME}" \
                        REPORT_EMAIL="${params.REPORT_EMAIL}" \
                        npm run test:ci
                    """
                }
            }
        }

        stage('Archive Report') {
            steps {
                archiveArtifacts artifacts: 'Platform Unification/extent-report/**', allowEmptyArchive: true
            }
        }
    }
}
```

### CI Behavior

- **Headless**: Browser runs without a visible window
- **Report**: Generated at `extent-report/New Report.html`
- **Email**: Automatically sent with subject **"Platform Unification Report - {CUname}/{Envname}"** and the HTML report attached
- **Parameters**: CU name and Env name from Jenkins UI override `testData.xlsx` values

---

## Test Data

Test data is read from `data/testData.xlsx` by default. The Excel file has key-value rows:

| Key | Description |
|---|---|
| `Cuname` | Credit Union name |
| `Env` | Environment name |
| `CuHeader` | CU header display name |
| `Departmentname` | Department name for settings tests |

All values can be overridden via environment variables (`CUNAME`, `ENVNAME`, `CUHEADER`, `DEPARTMENTNAME`).

---

## Reports

After each run, the custom Extent Reporter generates:
- `extent-report/New Report.html` — Full report with screenshots, steps, and data alerts
- `extent-report/screenshots/` — Test screenshots
- `extent-report-history/index.html` — Copy for historical tracking

---

## npm Scripts

| Script | Description |
|---|---|
| `npm test` | Run all tests with default reporter |
| `npm run test:chatai` | Chat AI suite (clears session first) |
| `npm run test:voiceai` | Voice AI suite (clears session first) |
| `npm run test:ci` | CI-optimized run (no session clear, list + extent reporter) |
| `npm run preclear` | Clear saved SSO session |
| `npm run playwright:install` | Install Playwright browsers |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `npx playwright install` fails | Ensure Node.js >= 18 is installed; run as admin on Windows |
| Tests fail with "browser not found" | Re-run `npx playwright install --with-deps chromium` |
| SSO session issues | Run `npm run preclear` to clear cached session data |
| Email not sent in CI | Verify `SMTP_*` environment variables are set correctly |
