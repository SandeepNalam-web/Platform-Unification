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
                        sh 'mkdir -p auth && echo "{}" > auth/storageState.json'
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

                        def cuVal  = params.Cuname  ?: ''
                        def envVal = params.TEST_ENV ?: ''

                        def envVars = [
                            "PU_CUNAME=${cuVal}",
                            "ENVNAME=${envVal}",
                            "PU_CUHEADER=${params.CuHeader ?: ''}",
                            "PU_DEPARTMENTNAME=${params.Departmentname ?: ''}",
                            "REPORT_EMAIL=${params.EMAIL_RECIPIENTS ?: ''}",
                            "TEST_SCOPE=${params.TEST_SCOPE ?: 'ci'}",
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
                                unstable('Some tests failed - check the report for details')
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
        }
        success {
            script {
                println("Platform Unification pipeline succeeded | CU: ${params.Cuname ?: '(from testData.xlsx)'} | Env: ${params.TEST_ENV ?: '(from testData.xlsx)'} | Scope: ${params.TEST_SCOPE}")
            }
        }
        failure {
            script {
                printColored('Pipeline failed - check stage logs above', "\u001B[31m")
            }
        }
    }
}
