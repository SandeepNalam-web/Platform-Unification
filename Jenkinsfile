#!/usr/bin/env groovy

def printColored(String text, String colorCode) {
    final String RESET = "\u001B[0m"
    println("${colorCode}${text}${RESET}")
}

pipeline {
    agent {
        kubernetes {
            label 'qautomation'
            inheritFrom 'default-nodejs'
            containerTemplate {
                name 'jnlp'
                image '441141375531.dkr.ecr.us-west-2.amazonaws.com/common/jenkins/inbound-agent:qaautomationv2'
            }
        }
    }

    parameters {
        string(name: 'Cuname',           defaultValue: '',                     description: 'Override just the CU name')
        string(name: 'TEST_ENV',         defaultValue: '',                     description: 'Override just the environment (e.g. UAT, PROD)')
        string(name: 'CuHeader',         defaultValue: '',                     description: 'Override just the CU header display name')
        string(name: 'Departmentname',   defaultValue: '',                     description: 'Override just the department name')
        choice(name: 'TEST_SCOPE',       choices: ['ci', 'chatai', 'voiceai'], description: 'Test suite to run: ci (full), chatai (Chat AI only), voiceai (Voice AI only)')
        string(name: 'BRANCH',           defaultValue: 'main',                 description: 'Branch to run tests from')
        string(name: 'EMAIL_RECIPIENTS', defaultValue: '',                     description: 'Comma-separated email addresses to send the report to (blank = no email)')
    }

    environment {
        NODE_TLS_REJECT_UNAUTHORIZED = '0'
        CI                           = 'true'
        AWS_REGION                   = 'us-west-2'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '30'))
        timeout(time: 60, unit: 'MINUTES')
        timestamps()
    }

    stages {
        stage('Install') {
            steps {
                dir('Platform Unification') {
                    script {
                        printColored('Installing dependencies', "\u001B[34m")
                        sh 'npm ci'
                        sh 'npx playwright install chromium'
                        printColored('Dependencies installed', "\u001B[32m")
                    }
                }
            }
        }

        stage('Run Tests') {
            steps {
                dir('Platform Unification') {
                    script {
                        printColored("Running Playwright tests (scope: ${params.TEST_SCOPE})", "\u001B[34m")

                        def envVars = [
                            "CUNAME=${params.Cuname}",
                            "ENVNAME=${params.TEST_ENV}",
                            "CUHEADER=${params.CuHeader}",
                            "DEPARTMENTNAME=${params.Departmentname}",
                            "REPORT_EMAIL=${params.EMAIL_RECIPIENTS}",
                        ]

                        withEnv(envVars) {
                            def cmd
                            switch (params.TEST_SCOPE) {
                                case 'chatai':
                                    cmd = 'npm run test:chatai'
                                    break
                                case 'voiceai':
                                    cmd = 'npm run test:voiceai'
                                    break
                                default:
                                    cmd = 'npm run test:ci'
                            }

                            def status = sh(script: cmd, returnStatus: true)

                            if (status != 0) {
                                printColored("Tests completed with failures (exit code: ${status})", "\u001B[33m")
                                unstable('Some tests failed — check the report for details')
                            } else {
                                printColored('All tests passed', "\u001B[32m")
                            }
                        }
                    }
                }
            }
        }
    }

    post {
        always {
            dir('Platform Unification') {
                archiveArtifacts artifacts: 'test-results/**,playwright-report/**,extent-report/**', allowEmptyArchive: true
            }

            script {
                if (params.EMAIL_RECIPIENTS?.trim()) {
                    def subject = "${currentBuild.currentResult}: Platform Unification — ${params.Cuname ?: 'default'} / ${params.TEST_ENV ?: 'default'} (${params.TEST_SCOPE})"
                    def body = """
                        <h2>Platform Unification Test Report</h2>
                        <table style="border-collapse:collapse;font-family:sans-serif;">
                            <tr><td style="padding:4px 12px;font-weight:bold;">Status</td><td style="padding:4px 12px;">${currentBuild.currentResult}</td></tr>
                            <tr><td style="padding:4px 12px;font-weight:bold;">CU Name</td><td style="padding:4px 12px;">${params.Cuname ?: '(from TestData.xlsx)'}</td></tr>
                            <tr><td style="padding:4px 12px;font-weight:bold;">Environment</td><td style="padding:4px 12px;">${params.TEST_ENV ?: '(from TestData.xlsx)'}</td></tr>
                            <tr><td style="padding:4px 12px;font-weight:bold;">Scope</td><td style="padding:4px 12px;">${params.TEST_SCOPE}</td></tr>
                            <tr><td style="padding:4px 12px;font-weight:bold;">Branch</td><td style="padding:4px 12px;">${params.BRANCH}</td></tr>
                            <tr><td style="padding:4px 12px;font-weight:bold;">Build</td><td style="padding:4px 12px;"><a href="${BUILD_URL}">${BUILD_URL}</a></td></tr>
                        </table>
                        <p>View the full report and artifacts on <a href="${BUILD_URL}artifact/">Jenkins</a>.</p>
                    """.stripIndent().trim()

                    def recipients = params.EMAIL_RECIPIENTS.trim().split(',').collect { it.trim() }.join(',')

                    sh """
                        aws ses send-email --region us-west-2 --profile interface \
                            --from 'no-reply@interface.ai' \
                            --destination "ToAddresses=${recipients}" \
                            --message "Subject={Data='${subject}',Charset=utf8},Body={Html={Data='${body.replace("'", "\\'")}',Charset=utf8}}"
                    """
                    printColored("Report emailed via SES to: ${params.EMAIL_RECIPIENTS}", "\u001B[32m")
                }
            }
        }
        success {
            script {
                def msg = """
                    Platform Unification pipeline succeeded
                    ─────────────────────────────────────
                    CU Name     : ${params.Cuname ?: '(from TestData.xlsx)'}
                    Environment : ${params.TEST_ENV ?: '(from TestData.xlsx)'}
                    Scope       : ${params.TEST_SCOPE}
                    Branch      : ${params.BRANCH}
                """.stripIndent().trim()
                println(msg)
            }
        }
        failure {
            script {
                printColored('Pipeline failed — check stage logs above', "\u001B[31m")
            }
        }
    }
}
