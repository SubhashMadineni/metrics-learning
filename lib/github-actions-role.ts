import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface GithubActionsRoleProps {
  readonly githubOrg: string;
  readonly githubRepo: string;
  readonly githubBranches?: string[];
}

export class GithubActionsRole extends Construct {
  public readonly role: iam.Role;

  constructor(scope: Construct, id: string, props: GithubActionsRoleProps) {
    super(scope, id);

    // Create the OIDC provider for GitHub if it doesn't exist
    const provider = new iam.OpenIdConnectProvider(this, 'GitHubProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
      thumbprints: ['6938fd4d98bab03faadb97b34396831e3780aea1'],
    });

    // Branches to allow access from, default to main
    const githubBranches = props.githubBranches || ['main'];
    
    // Create conditions for the trust policy
    const subCondition = githubBranches.map(branch => 
      `repo:${props.githubOrg}/${props.githubRepo}:ref:refs/heads/${branch}`
    ).join(' ');

    // Create the IAM role for GitHub Actions
    this.role = new iam.Role(this, 'Role', {
      assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
        StringLike: {
          'token.actions.githubusercontent.com:sub': subCondition,
        },
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        },
      }),
      description: 'GitHub Actions deployment role',
      roleName: `github-actions-${props.githubRepo}-role`,
      maxSessionDuration: cdk.Duration.hours(1),
    });

    // Add required permissions for ECR and EC2
    this.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonElasticContainerRegistryPublicFullAccess'));
    this.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMFullAccess'));
    
    // Add permissions to describe and filter EC2 instances
    this.role.addToPrincipalPolicy(new iam.PolicyStatement({
      actions: [
        'ec2:DescribeInstances',
      ],
      resources: ['*'],
    }));

    // Output the role ARN to use in GitHub secrets
    new cdk.CfnOutput(this, 'RoleArn', {
      value: this.role.roleArn,
      description: 'The ARN of the IAM role for GitHub Actions',
    });
    
    // Output a reminder to set the role ARN in GitHub secrets
    new cdk.CfnOutput(this, 'GithubSecretInstructions', {
      value: `Add this role ARN to your GitHub repository secrets as AWS_ROLE_ARN`,
      description: 'Instructions for GitHub setup',
    });
  }
} 