#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MetricsAppStack } from '../lib/metrics-app-stack';

const app = new cdk.App();
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