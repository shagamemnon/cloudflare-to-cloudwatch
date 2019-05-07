# Cloudflare to Cloudwatch
Stream Cloudflare ELS logs into CloudWatch

## Setup
1. [On the roles page](https://console.aws.amazon.com/iam/home#/roles), create a role with the following properties.
- Trusted entity – AWS Lambda.
- Permissions – AWSLambdaBasicExecutionRole.
- Role name – cloudflare-logs-role
2. [In CloudWatch under *Logs*](https://console.aws.amazon.com/cloudwatch/home#logs:), create a new group, `cloudflare-group` and a new stream, `cloudflare-log-stream`
3. In Cloudflare, retrieve your Global API Key (https://dash.cloudflare.com/profile) and your account ID: `https://dash.cloudflare.com/..MY_ACCOUNT_KEY../example.com`, then modify the runtime environment variables in `config/default.yml`:
```yaml
# default.yml

region: 'us-east-1'

# ...

schedule:
  name: 'fiveminutes'
  expression: 'rate(5 minutes)'

# ...

runtime:
  interval: 5
  cf:
    authKey: CF_AUTH_KEY
    authEmail: CF_EMAIL
    orgId: CF_ORG_ID
```

## Deploy
> Note that you must have the AWS CLI configured to complete this deployment
```
# Install local dependencies
npm install -g gulp && npm install
```

```
# Deploy to lambda
npm run deploy
```
