import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { Construct } from 'constructs';
import * as path from 'path';

export class MetricsAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a VPC
    const vpc = new ec2.Vpc(this, 'MetricsAppVPC', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        }
      ]
    });

    // Create security group for the EC2 instance
    const securityGroup = new ec2.SecurityGroup(this, 'MetricsAppSG', {
      vpc,
      description: 'Allow SSH (TCP port 22) and application ports',
      allowAllOutbound: true
    });

    // Allow SSH access
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'Allow SSH access from anywhere'
    );

    // Allow application ports
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP access'
    );
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS access'
    );
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(8080),
      'Allow metrics-app access'
    );
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(9090),
      'Allow Prometheus access'
    );
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(3000),
      'Allow Grafana access'
    );

    // Create IAM role for the EC2 instance
    const role = new iam.Role(this, 'MetricsAppInstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
    });

    // Add permissions to pull from ECR
    role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonECR-FullAccess')
    );

    // Create the ECR repository if it doesn't exist
    const repository = new ecr.Repository(this, 'MetricsAppRepository', {
      repositoryName: 'metrics-app',
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    // Create the EC2 instance
    const instance = new ec2.Instance(this, 'MetricsAppInstance', {
      vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MEDIUM
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup,
      role,
      keyName: 'metrics-app-key', // Make sure to create this key pair in the AWS console
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC
      }
    });

    // Add user data script to set up Docker and run the application
    const userDataScript = new Asset(this, 'UserDataScript', {
      path: path.join(__dirname, '../scripts/user-data.sh')
    });

    const localPath = instance.userData.addS3DownloadCommand({
      bucket: userDataScript.bucket,
      bucketKey: userDataScript.s3ObjectKey,
    });

    instance.userData.addExecuteFileCommand({
      filePath: localPath,
      arguments: repository.repositoryUri
    });

    // Output the instance public IP and ECR repository URI
    new cdk.CfnOutput(this, 'InstancePublicIP', {
      value: instance.instancePublicIp,
      description: 'Public IP address of the EC2 instance'
    });

    new cdk.CfnOutput(this, 'ECRRepositoryURI', {
      value: repository.repositoryUri,
      description: 'URI of the ECR repository'
    });
  }
} 