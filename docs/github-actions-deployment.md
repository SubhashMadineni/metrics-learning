# GitHub Actions AWS Deployment Guide

This guide explains how to set up GitHub Actions to deploy your metrics application to AWS using CDK.

## Prerequisites

1. An AWS account
2. A GitHub repository containing your application code
3. Basic knowledge of AWS and GitHub Actions

## Step 1: Create the GitHub Actions IAM Role in AWS

Before you can deploy from GitHub Actions, you need to create an IAM role that GitHub Actions can assume.

1. **Deploy the GitHub Actions role using CDK**:

   ```bash
   # Navigate to the CDK directory
   cd cdk
   
   # Install dependencies
   npm install
   
   # Make sure to edit bin/metrics-app.ts to set your GitHub username/org and repo name
   
   # Deploy only the GitHub Actions role stack
   npx cdk deploy GithubActionsRoleStack
   ```

2. **Note the role ARN from the output**:

   After deployment, the CDK will output something like:
   ```
   GithubActionsRoleStack.GitHubActionsRoleRoleArn = arn:aws:iam::123456789012:role/metrics-learning-github-actions-role
   ```

   Save this ARN, as you'll need it in the next step.

## Step 2: Configure GitHub Repository Secrets

1. Go to your GitHub repository
2. Navigate to Settings > Secrets and variables > Actions
3. Add a new repository secret:
   - Name: `AWS_ROLE_ARN`
   - Value: The role ARN from step 1 (e.g., `arn:aws:iam::123456789012:role/metrics-learning-github-actions-role`)

## Step 3: Configure GitHub OIDC with AWS

This step is already handled by the CDK deployment in Step 1, which creates the OIDC provider and trust relationship.

## Step 4: Verify the GitHub Actions Workflow

1. Make sure your repository contains the `.github/workflows/deploy.yml` file
2. This workflow will:
   - Build your Go application
   - Create a Docker image
   - Push the image to Amazon ECR
   - Deploy infrastructure using CDK
   - Deploy the application to EC2

## Step 5: Trigger a Deployment

1. Push a change to your main branch:
   ```bash
   git add .
   git commit -m "Update for deployment"
   git push origin main
   ```

2. Go to the "Actions" tab in your GitHub repository to monitor the workflow run

3. Once the workflow completes successfully, your application will be deployed to AWS

## Step 6: Access Your Application

After deployment, find your EC2 instance IP in the AWS console or CloudFormation outputs.

You can access your application at:
- Metrics App: http://[EC2-IP]:8080
- Prometheus: http://[EC2-IP]:9090
- Grafana: http://[EC2-IP]:3000 (username: admin, password: admin)

## Troubleshooting

### GitHub Actions Permission Error
If you see errors like "not authorized to perform: sts:AssumeRoleWithWebIdentity", check:
1. That the GitHub repository name and org/username in the CDK deployment match your actual repository
2. That the AWS_ROLE_ARN secret is correctly set in GitHub
3. That you're pushing to the branch specified in the role trust policy (default is 'main')

### CDK Deployment Errors
If CDK deployment fails:
1. Check CloudFormation in the AWS console for detailed error messages
2. Make sure your role has sufficient permissions for all resources being created
3. Verify that the region specified in the GitHub workflow matches the region you deployed the role to

## Security Considerations

- The IAM role created has broad permissions for demonstration purposes
- For production use, you should restrict permissions to only what is needed
- Consider adding a condition for specific workflow file paths in the IAM role trust policy
- Regularly rotate credentials and review permissions 