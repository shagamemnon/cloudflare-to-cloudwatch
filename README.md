# Cloudflare to Cloudwatch
Stream Cloudflare ELS logs into CloudWatch
## Setup
1. [https://console.aws.amazon.com/iam/home#/roles](On the roles page), create a role with the following properties.
- Trusted entity – AWS Lambda.
- Permissions – AWSLambdaBasicExecutionRole.
- Role name – cloudflare-logs-role
2. [https://console.aws.amazon.com/cloudwatch/home#logs:](In CloudWatch under *Logs*), create a new group, `cloudflare-group` and a new stream, `cloudflare-log-stream`
3. In Cloudflare, retrieve your Global API Key (https://dash.cloudflare.com/profile)
4. Modify the runtime environment variables in `default.yml`

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
