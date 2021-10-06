properties([
  parameters([
    booleanParam(
      name: 'overrideDefaults',
      defaultValue: false,
      description: 'Override defaults - if this is false, all of the following options will do nothing.',
    ),
    booleanParam(
      name: 'deployDev',
      defaultValue: true,
      description: 'Deploy template to development environment.',
    ),
    booleanParam(
      name: 'deployProd',
      defaultValue: false,
      description: 'Deploy template to production environment.',
    ),
  ])
])

node {

  // Initialize Variables
  def dockerImage = null
  def taskRevision = null
  def deployDev = false
  def deployProd = false

  // Check Service Deployed
  def devServiceStatus = "INACTIVE";
  def prodServiceStatus = "INACTIVE";

    // Handle Overridden Behavior
    if (params.overrideDefaults) {

    // Manage Dev Deployment
    if (params.deployDev) {
      deployDev = true
    } else {
      deployDev = false
    }

    // Manage Prod Deployment
    if (params.deployProd) {
      deployProd = true
    } else {
      deployProd = false
    }

  // Handle Default Behavior
  } else {
    deployDev = true
    deployProd = false
  }

  // Environment Variables (Main)
  env.ecrRegistry = 'CHANGE ME'
  env.ecrCredentials = 'CHANGE ME'

  // Infrastructure Variables (Dev)
  env.ecsFamilyDev = 'CHANGE ME'
  env.ecsClusterDev = 'CHANGE ME'
  env.ecsTaskDefinitionDev = 'file://aws/task-definition.dev.json'
  env.ecsServiceDefinitionDev = 'file://aws/service-definition.dev.json'
  env.ecsServiceDev = 'CHANGE ME'

  // Infrastructure Variables (Prod)
  env.ecsFamilyProd = 'CHANGE ME'
  env.ecsClusterProd = 'CHANGE ME'
  env.ecsTaskDefinitionProd = 'file://aws/task-definition.prod.json'
  env.ecsServiceDefinitionProd = 'file://aws/service-definition.prod.json'
  env.ecsServiceProd = 'CHANGE ME'

  // Clone Current Repository
  stage('Clone Repository') {
    echo 'Cloning Current Repository State ...'
    checkout scm
  }

  // Build Docker Image (Dev)
  stage('Dev - Build Docker Image') {
    if (deployDev) {
      echo 'Building Docker Image ...'
      devDockerImage = docker.build('CHANGE ME', "--build-arg environment=development .")
    }
  }

  // Push Image to AWS ECR (Dev)
  stage('Dev - Save Docker Image') {
    if (deployDev) {
      echo 'Pushing Image to Registry ...'
      docker.withRegistry(env.ecrRegistry, env.ecrCredentials) {
        devDockerImage.push('dev-latest')
      }
    }
  }

  // Register Task Definition (Dev)
  stage('Dev - Register Task Definition') {
    if (deployDev) {
      echo 'Handling Task Definition Registration ...'
      sh("aws ecs register-task-definition \
        --family ${ env.ecsFamilyDev } \
        --cli-input-json ${ env.ecsTaskDefinitionDev }")
    }
  }

  // Get Last Task Revision (Dev)
  stage('Dev - Load Last Task Revision') {
    if (deployDev) {
      echo 'Check Task Definition and Get Last Revision ...'
      taskRevision = sh(returnStdout: true, script: "aws ecs describe-task-definition \
        --task-definition ${ env.ecsFamilyDev } \
        | egrep 'revision' \
        | tr ',' ' ' \
        | awk '{ print \$2 }'").trim()
    }
  }

  // Remove Existing Service (Dev)
  stage('Dev - Remove Existing Service') {
    if (deployDev) {
      devServiceStatus = sh(returnStdout:true, script: "aws ecs describe-services \
        --cluster ${ env.ecsClusterDev } \
        --services ${ env.ecsServiceDev } \
        | jq --raw-output 'select(.services[].status != null ) \
        | .services[].status'")?.trim()
      if (devServiceStatus == "ACTIVE") {
        sh("aws ecs delete-service \
          --cluster ${ env.ecsClusterDev } \
          --service ${ env.ecsServiceDev } \
          --force")
      }
    }
  }

  // Wait Until Service Drains (Dev)
  stage('Dev - Wait Until Service Drains') {
    if (deployDev) {
      attempts = 0
      while (((devServiceStatus == "ACTIVE") || \
              (devServiceStatus == "DRAINING")) && \
              (attempts <= 10)) {
        devServiceStatus = sh(returnStdout:true, script: "aws ecs describe-services \
          --cluster ${ env.ecsClusterDev } \
          --services ${ env.ecsServiceDev } \
          | jq --raw-output 'select(.services[].status != null ) \
          | .services[].status'")?.trim()
        sleep(time: 30, unit: "SECONDS")
        attempts += 1
      }
    }
  }

  // Deploy Cluster Service (Dev)
  stage('Dev - Deploy Cluster Service') {
    if (deployDev && devServiceStatus == "INACTIVE") {
      echo 'Deploy Updated Service to Cluster ...'
      devServiceStatus = "ACTIVE"
      sh("aws ecs create-service \
        --cluster ${ env.ecsClusterDev } \
        --cli-input-json ${ env.ecsServiceDefinitionDev }")
    }
  }

  // Configure Cluster Service for Autoscaling (Dev)
  stage('Dev - Configure Cluster Service for Autoscaling') {
    if (deployDev && devServiceStatus == "ACTIVE") {
      targetPolicy = '{ \
        "TargetValue": 80.0, \
        "PredefinedMetricSpecification": { \
          "PredefinedMetricType": "ECSServiceAverageCPUUtilization" }, \
        "ScaleOutCooldown": 60, \
        "ScaleInCooldown": 60 }'
      sh("aws application-autoscaling register-scalable-target \
        --service-namespace ecs \
        --scalable-dimension ecs:service:DesiredCount \
        --resource-id service/${ env.ecsClusterDev }/${ env.ecsServiceDev } \
        --min-capacity 1 --max-capacity 1 --region us-east-1")
      sh("aws application-autoscaling put-scaling-policy \
        --service-namespace ecs --scalable-dimension ecs:service:DesiredCount \
        --resource-id service/${ env.ecsClusterDev }/${ env.ecsServiceDev } \
        --policy-name BlinkhashDevBitcoinScaling \
        --policy-type TargetTrackingScaling \
        --target-tracking-scaling-policy-configuration '${ targetPolicy }'")
    }
  }

  // Deploy to Cluster Service (Dev)
  stage('Dev - Deploy to Cluster Service') {
    if (deployDev && devServiceStatus == "ACTIVE") {
      echo 'Deploying to Development Cluster ...'
      sh("aws ecs update-service \
        --cluster ${ env.ecsClusterDev } \
        --service ${ env.ecsServiceDev } \
        --task-definition ${ env.ecsFamilyDev }:${ taskRevision } \
        --desired-count 1")
    }
  }

  // Build Docker Image (Prod)
  stage('Prod - Build Docker Image') {
    if (deployProd) {
      echo 'Building Docker Image ...'
      prodDockerImage = docker.build('CHANGE ME', "--build-arg environment=production .")
    }
  }

  // Push Image to AWS ECR (Prod)
  stage('Prod -
  Save Docker Image') {
    if (deployProd) {
      echo 'Pushing Image to Registry ...'
      docker.withRegistry(env.ecrRegistry, env.ecrCredentials) {
        prodDockerImage.push('prod-latest')
      }
    }
  }

  // Register Task Definition (Prod)
  stage('Prod - Register Task Definition') {
    if (deployProd) {
      echo 'Handling Task Definition Registration ...'
      sh("aws ecs register-task-definition \
        --family ${ env.ecsFamilyProd } \
        --cli-input-json ${ env.ecsTaskDefinitionProd }")
    }
  }

  // Get Last Task Revision (Prod)
  stage('Prod - Load Last Task Revision') {
    if (deployProd) {
      echo 'Check Task Definition and Get Last Revision ...'
      taskRevision = sh(returnStdout: true, script: "aws ecs describe-task-definition \
        --task-definition ${ env.ecsFamilyProd } \
        | egrep 'revision' \
        | tr ',' ' ' \
        | awk '{ print \$2 }'").trim()
    }
  }

  // Remove Existing Service (Prod)
  stage('Prod - Remove Existing Service') {
    if (deployProd) {
      ProdServiceStatus = sh(returnStdout:true, script: "aws ecs describe-services \
        --cluster ${ env.ecsClusterProd } \
        --services ${ env.ecsServiceProd } \
        | jq --raw-output 'select(.services[].status != null ) \
        | .services[].status'")?.trim()
      if (ProdServiceStatus == "ACTIVE") {
        sh("aws ecs delete-service \
          --cluster ${ env.ecsClusterProd } \
          --service ${ env.ecsServiceProd } \
          --force")
      }
    }
  }

  // Wait Until Service Drains (Prod)
  stage('Prod - Wait Until Service Drains') {
    if (deployProd) {
      attempts = 0
      while (((ProdServiceStatus == "ACTIVE") || \
              (ProdServiceStatus == "DRAINING")) && \
              (attempts <= 10)) {
        ProdServiceStatus = sh(returnStdout:true, script: "aws ecs describe-services \
          --cluster ${ env.ecsClusterProd } \
          --services ${ env.ecsServiceProd } \
          | jq --raw-output 'select(.services[].status != null ) \
          | .services[].status'")?.trim()
        sleep(time: 30, unit: "SECONDS")
        attempts += 1
      }
    }
  }

  // Deploy Cluster Service (Prod)
  stage('Prod - Deploy Cluster Service') {
    if (deployProd && prodServiceStatus == "INACTIVE") {
      echo 'Deploy Updated Service to Cluster ...'
      prodServiceStatus = "ACTIVE"
      sh("aws ecs create-service \
        --cluster ${ env.ecsClusterProd } \
        --cli-input-json ${ env.ecsServiceDefinitionProd }")
    }
  }

  // Configure Cluster Service for Autoscaling (Prod)
  stage('Prod - Configure Cluster Service for Autoscaling') {
    if (deployProd && prodServiceStatus == "ACTIVE") {
      targetPolicy = '{ \
        "TargetValue": 80.0, \
        "PredefinedMetricSpecification": { \
          "PredefinedMetricType": "ECSServiceAverageCPUUtilization" }, \
        "ScaleOutCooldown": 60, \
        "ScaleInCooldown": 60 }'
      sh("aws application-autoscaling register-scalable-target \
        --service-namespace ecs \
        --scalable-dimension ecs:service:DesiredCount \
        --resource-id service/${ env.ecsClusterProd }/${ env.ecsServiceProd } \
        --min-capacity 1 --max-capacity 1 --region us-east-1")
      sh("aws application-autoscaling put-scaling-policy \
        --service-namespace ecs --scalable-dimension ecs:service:DesiredCount \
        --resource-id service/${ env.ecsClusterProd }/${ env.ecsServiceProd } \
        --policy-name BlinkhashProdBitcoinScaling \
        --policy-type TargetTrackingScaling \
        --target-tracking-scaling-policy-configuration '${ targetPolicy }'")
    }
  }

  // Deploy to Cluster Service (Prod)
  stage('Prod - Deploy to Cluster Service') {
    if (deployProd && prodServiceStatus == "ACTIVE") {
      echo 'Deploying to Quality Assurance Cluster ...'
      sh("aws ecs update-service \
        --cluster ${ env.ecsClusterProd } \
        --service ${ env.ecsServiceProd } \
        --task-definition ${ env.ecsFamilyProd }:${ taskRevision } \
        --desired-count 3")
    }
  }
}
