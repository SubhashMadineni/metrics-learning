#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MetricsAppStack } from '../lib/metrics-app-stack';
import { GithubActionsRole } from '../lib/github-actions-role';

const app = new cdk.App();

// Create the GitHub Actions role for deployments
// Replace these values with your actual GitHub organization and repository name
const githubActionsRoleStack = new cdk.Stack(app, 'GithubActionsRoleStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1' 
  },
  description: 'IAM role for GitHub Actions CI/CD',
});

const githubRole = new GithubActionsRole(githubActionsRoleStack, 'GitHubActionsRole', {
  githubOrg: 'subhashmadineni',    // REPLACE with your actual GitHub username
  githubRepo: 'metrics-learning',  // REPLACE with your actual repository name
  githubBranches: ['main'],        // Add other branches if needed
});

// Create the main application stack
new MetricsAppStack(app, 'MetricsAppStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1' 
  },
  tags: {
    Application: 'MetricsApp',
    Environment: 'Production'
  }
});

app.synth(); 