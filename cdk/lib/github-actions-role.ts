import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface GithubActionsRoleProps {
  /**
   * The GitHub organization or user that owns the repository
   */
  readonly githubOrg: string;

  /**
   * The name of the GitHub repository
   */
  readonly githubRepo: string;

  /**
   * Optional GitHub branch names that are allowed to assume the role
   * Default is ['main']
   */
  readonly githubBranches?: string[];
}

export class GithubActionsRole extends Construct {
  public readonly role: iam.Role;

  constructor(scope: Construct, id: string, props: GithubActionsRoleProps) {
    super(scope, id);

    const branches = props.githubBranches || ['main'];

    // Create the OIDC provider if it doesn't exist
    const provider = new iam.OpenIdConnectProvider(this, 'GithubProvider', {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    });

    // Define conditions for the trust relationship
    const conditions: { [key: string]: any } = {
      StringLike: {
        'token.actions.githubusercontent.com:sub': branches.map(
          branch => `repo:${props.githubOrg}/${props.githubRepo}:ref:refs/heads/${branch}`
        ),
      },
    };

    // Create the IAM role that GitHub Actions will assume
    this.role = new iam.Role(this, 'DeploymentRole', {
      assumedBy: new iam.WebIdentityPrincipal(
        provider.openIdConnectProviderArn,
        conditions
      ),
      description: 'Role assumed by GitHub Actions for CDK deployments',
      roleName: `${props.githubRepo}-github-actions-role`,
      // Maximum session duration of 1 hour
      maxSessionDuration: cdk.Duration.hours(1),
    });

    // Add permissions needed for deployment using correct AWS managed policies
    this.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonElasticContainerRegistryPublicFullAccess')
    );
    
    // Add private ECR access
    this.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonElasticContainerRegistryPublicFullAccess')
    );
    
    this.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2FullAccess')
    );
    
    this.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess')
    );
    
    this.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchLogsFullAccess')
    );

    // Add CloudFormation permissions required for CDK deployments
    this.role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'cloudformation:*',
        ],
        resources: ['*'],
      })
    );

    // Allow IAM permission management (needed for CDK to create roles)
    this.role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'iam:CreateRole',
          'iam:DeleteRole',
          'iam:GetRole',
          'iam:PassRole',
          'iam:AttachRolePolicy',
          'iam:DetachRolePolicy',
          'iam:PutRolePolicy',
          'iam:DeleteRolePolicy',
          'iam:GetRolePolicy',
          'iam:TagRole',
          'iam:ListRoleTags',
        ],
        resources: ['*'],
      })
    );

    // Output the role ARN
    new cdk.CfnOutput(this, 'RoleArn', {
      value: this.role.roleArn,
      description: 'ARN of the GitHub Actions IAM role',
      exportName: 'GitHubActionsRoleArn',
    });
  }
} 