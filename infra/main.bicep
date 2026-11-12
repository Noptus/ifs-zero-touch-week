targetScope = 'resourceGroup'

@description('Globally unique lowercase Azure name prefix, 4 to 18 characters.')
@minLength(4)
@maxLength(18)
param prefix string
param location string = resourceGroup().location
param tenantId string = subscription().tenantId
param entraClientId string
@secure()
param entraClientSecret string
param employeeObjectId string
param reviewerObjectId string
@secure()
param pgPassword string
@description('OpenAI-compatible vision endpoint including its /v1 path. Empty disables inference.')
param visionBaseUrl string = ''
param visionModel string = ''
@secure()
param visionApiKey string = ''

var admin = 'pilotadmin'
var appName = '${prefix}-app'
var serverName = '${prefix}-pg'

resource network 'Microsoft.Network/virtualNetworks@2024-05-01' = {
  name: '${prefix}-vnet'
  location: location
  properties: {
    addressSpace: { addressPrefixes: ['10.92.0.0/23'] }
  }
}
resource appSubnet 'Microsoft.Network/virtualNetworks/subnets@2024-05-01' = {
  parent: network
  name: 'app'
  properties: {
    addressPrefix: '10.92.0.0/26'
    delegations: [
      { name: 'appservice', properties: { serviceName: 'Microsoft.Web/serverFarms' } }
    ]
  }
}
resource dbSubnet 'Microsoft.Network/virtualNetworks/subnets@2024-05-01' = {
  parent: network
  name: 'database'
  dependsOn: [appSubnet]
  properties: {
    addressPrefix: '10.92.0.64/27'
    delegations: [
      { name: 'postgres', properties: { serviceName: 'Microsoft.DBforPostgreSQL/flexibleServers' } }
    ]
  }
}
resource dns 'Microsoft.Network/privateDnsZones@2024-06-01' = {
  name: '${prefix}.private.postgres.database.azure.com'
  location: 'global'
}
resource dnsLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2024-06-01' = {
  parent: dns
  name: 'pilot-network'
  location: 'global'
  properties: {
    virtualNetwork: { id: network.id }
    registrationEnabled: false
  }
}
resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: serverName
  location: location
  sku: { name: 'Standard_B1ms', tier: 'Burstable' }
  dependsOn: [dnsLink]
  properties: {
    version: '16'
    administratorLogin: admin
    administratorLoginPassword: pgPassword
    backup: { backupRetentionDays: 7 }
    storage: { storageSizeGB: 32 }
    network: {
      publicNetworkAccess: 'Disabled'
      delegatedSubnetResourceId: dbSubnet.id
      privateDnsZoneArmResourceId: dns.id
    }
  }
}
resource db 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  parent: postgres
  name: 'pilot'
  properties: { charset: 'UTF8', collation: 'en_US.utf8' }
}
resource plan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: '${prefix}-plan'
  location: location
  kind: 'linux'
  sku: { name: 'B1', capacity: 1 }
  properties: { reserved: true }
}
resource app 'Microsoft.Web/sites@2024-04-01' = {
  name: appName
  location: location
  kind: 'app,linux'
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    virtualNetworkSubnetId: appSubnet.id
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      appCommandLine: 'node server-dist/index.js'
      alwaysOn: true
      minTlsVersion: '1.2'
      scmMinTlsVersion: '1.2'
      ftpsState: 'Disabled'
      healthCheckPath: '/healthz'
      appSettings: [
        { name: 'PILOT_AUTH', value: 'entra' }
        { name: 'MICROSOFT_PROVIDER_AUTHENTICATION_SECRET', value: entraClientSecret }
        { name: 'PILOT_TENANT_ID', value: tenantId }
        { name: 'PILOT_EMPLOYEE_OBJECT_ID', value: employeeObjectId }
        { name: 'PILOT_REVIEWER_OBJECT_ID', value: reviewerObjectId }
        { name: 'PGHOST', value: postgres.properties.fullyQualifiedDomainName }
        { name: 'PGUSER', value: admin }
        { name: 'PGPASSWORD', value: pgPassword }
        { name: 'PGDATABASE', value: db.name }
        { name: 'PG_TLS', value: '1' }
        { name: 'VISION_BASE_URL', value: visionBaseUrl }
        { name: 'VISION_MODEL', value: visionModel }
        { name: 'VISION_API_KEY', value: visionApiKey }
      ]
    }
  }
}
resource auth 'Microsoft.Web/sites/config@2024-04-01' = {
  parent: app
  name: 'authsettingsV2'
  properties: {
    platform: { enabled: true }
    globalValidation: {
      requireAuthentication: true
      unauthenticatedClientAction: 'RedirectToLoginPage'
      redirectToProvider: 'azureactivedirectory'
      excludedPaths: ['/healthz']
    }
    identityProviders: {
      azureActiveDirectory: {
        enabled: true
        registration: {
          clientId: entraClientId
          clientSecretSettingName: 'MICROSOFT_PROVIDER_AUTHENTICATION_SECRET'
          openIdIssuer: '${environment().authentication.loginEndpoint}${tenantId}/v2.0'
        }
        validation: {
          allowedAudiences: [entraClientId]
          defaultAuthorizationPolicy: {
            allowedPrincipals: { identities: [employeeObjectId, reviewerObjectId] }
          }
        }
      }
    }
    httpSettings: { requireHttps: true }
  }
}
output pilotUrl string = 'https://${app.properties.defaultHostName}/ifs-zero-touch-week/'
output redirectUri string = 'https://${app.properties.defaultHostName}/.auth/login/aad/callback'
