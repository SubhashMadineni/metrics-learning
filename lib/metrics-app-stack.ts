import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';
import * as fs from 'fs';

export class MetricsAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create an ECR repository for our Docker images
    const repository = new ecr.Repository(this, 'MetricsRepository', {
      repositoryName: 'metrics-app',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create a VPC
    const vpc = new ec2.Vpc(this, 'MetricsVpc', {
      maxAzs: 2,
      natGateways: 0, // Use public subnet only to save costs
    });

    // Create a security group for our EC2 instance
    const securityGroup = new ec2.SecurityGroup(this, 'MetricsSecurityGroup', {
      vpc,
      description: 'Allow inbound traffic to metrics app',
      allowAllOutbound: true,
    });

    // Allow inbound traffic for our services
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH access');
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(8080), 'Allow metrics app access');
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(9090), 'Allow Prometheus access');
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3000), 'Allow Grafana access');

    // Create role for the EC2 instance
    const role = new iam.Role(this, 'MetricsInstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonElasticContainerRegistryPublicFullAccess')
      ],
    });

    // Add ECR pull permissions to the role
    repository.grantPull(role);

    // Use user data script for EC2 instance setup
    const userData = ec2.UserData.forLinux();
    const userDataScript = fs.readFileSync('./lib/user-data.sh', 'utf8');
    userData.addCommands(userDataScript);
    
    // Create the EC2 instance
    const instance = new ec2.Instance(this, 'MetricsAppInstance', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
      machineImage: ec2.MachineImage.latestAmazonLinux2023({
        cachedInContext: false, // Always get the latest AMI
      }),
      securityGroup,
      keyName: 'metrics-app-key', // Replace with your key pair name or create one in the AWS console
      role,
      userData,
    });

    // Output the ECR repository URI
    new cdk.CfnOutput(this, 'RepositoryURI', {
      value: repository.repositoryUri,
      description: 'The URI of the ECR repository',
    });

    // Output the instance's public IP address
    new cdk.CfnOutput(this, 'InstancePublicIp', {
      value: instance.instancePublicIp,
      description: 'The public IP address of the EC2 instance',
    });
    
    // Output the region
    new cdk.CfnOutput(this, 'Region', {
      value: this.region,
      description: 'The AWS region (us-east-2)',
    });
  }
} 